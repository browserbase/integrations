import readline from 'node:readline';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import {
  browserbaseConfigSchema,
  mergeConfig,
  parseConfig,
  type BrowserbaseConfig,
} from './config.js';
import {
  dotenvEscape,
  maskSecret,
  readPluginConfig,
  resolveConfigPath,
  shellEscape,
  writePluginConfig,
} from './config-store.js';
import {
  defaultSkillsRoot,
  hasBrowserbaseSkills,
  installedSkillFiles,
  resolveSkillsRoot,
  syncBrowserbaseSkills,
} from './skills-sync.js';

const PLUGIN_ID = 'browserbase';

function createLogger(
  api: Partial<OpenClawPluginApi>
): OpenClawPluginApi['logger'] {
  if (api.logger) {
    return api.logger;
  }

  return {
    info: (msg: string) => console.log(msg),
    warn: (msg: string) => console.warn(msg),
    error: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
    debug: (msg: string) => console.debug(msg),
  };
}

function parseConfigSafe(
  raw: unknown,
  logger: OpenClawPluginApi['logger'],
  label: string
): BrowserbaseConfig {
  try {
    return parseConfig(raw);
  } catch (error) {
    logger.warn(
      `browserbase: ignoring invalid ${label} (${String((error as Error)?.message ?? error)})`
    );
    return parseConfig({});
  }
}

function runtimeConfig(
  api: OpenClawPluginApi,
  logger: OpenClawPluginApi['logger']
): BrowserbaseConfig {
  return parseConfigSafe(api.pluginConfig, logger, 'pluginConfig');
}

function loadMergedConfig(
  api: OpenClawPluginApi,
  logger: OpenClawPluginApi['logger'],
  explicitPath?: string
): { configPath: string; config: BrowserbaseConfig } {
  const configPath = resolveConfigPath(explicitPath);
  const fromRuntime = runtimeConfig(api, logger);
  let rawFileConfig: Record<string, unknown> = {};
  try {
    rawFileConfig = readPluginConfig(configPath, PLUGIN_ID);
  } catch (error) {
    logger.warn(
      `browserbase: unable to read ${configPath} (${String((error as Error)?.message ?? error)})`
    );
  }
  const fromFile = parseConfigSafe(rawFileConfig, logger, `file ${configPath}`);
  return {
    configPath,
    config: mergeConfig(fromRuntime, fromFile),
  };
}

async function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function promptYesNo(
  rl: readline.Interface,
  question: string,
  defaultYes: boolean
): Promise<boolean> {
  const answer = (await ask(rl, question)).trim().toLowerCase();
  if (!answer) {
    return defaultYes;
  }

  if (['y', 'yes'].includes(answer)) {
    return true;
  }

  if (['n', 'no'].includes(answer)) {
    return false;
  }

  return defaultYes;
}

async function promptAndPersistCredentials(
  configPath: string,
  defaults: { apiKey?: string; projectId?: string },
  printHeader: boolean
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    if (printHeader) {
      console.log('\nBrowserbase setup\n');
      console.log('Get credentials from https://browserbase.com/settings\n');
    }

    const apiKeyQuestion = defaults.apiKey
      ? `Browserbase API key [${maskSecret(defaults.apiKey)}]: `
      : 'Browserbase API key: ';
    const projectIdQuestion = defaults.projectId
      ? `Browserbase project ID [${defaults.projectId}]: `
      : 'Browserbase project ID: ';

    const apiKeyInput = (await ask(rl, apiKeyQuestion)).trim();
    const projectIdInput = (await ask(rl, projectIdQuestion)).trim();

    const apiKey = apiKeyInput || defaults.apiKey;
    const projectId = projectIdInput || defaults.projectId;

    if (!apiKey || !projectId) {
      console.log(
        '\nSetup cancelled: both API key and project ID are required.'
      );
      return false;
    }

    writePluginConfig(configPath, PLUGIN_ID, {
      apiKey,
      projectId,
    });

    console.log(`\nSaved Browserbase credentials to ${configPath}`);
    console.log('Restart OpenClaw to activate remote browsing.\n');
    return true;
  } finally {
    rl.close();
  }
}

async function runSkillsSync(options?: {
  targetRoot?: string;
  ref?: string;
  logger?: OpenClawPluginApi['logger'];
  silent?: boolean;
}): Promise<boolean> {
  const logger = options?.logger;

  try {
    const result = await syncBrowserbaseSkills({
      targetRoot: options?.targetRoot,
      ref: options?.ref,
    });

    if (!options?.silent) {
      console.log(
        `Synced Browserbase skills from browserbase/skills@${result.ref} to ${result.targetRoot}`
      );
      console.log(`Files updated: ${result.filesWritten.length}`);
    }

    logger?.info(
      `browserbase: synced skills from browserbase/skills@${result.ref} to ${result.targetRoot}`
    );
    return true;
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    logger?.warn(`browserbase: skill sync failed (${message})`);
    if (!options?.silent) {
      console.warn(`Warning: failed to sync Browserbase skills: ${message}`);
      console.warn('Retry with: openclaw browserbase skills sync');
    }
    return false;
  }
}

function registerCli(
  api: OpenClawPluginApi,
  logger: OpenClawPluginApi['logger']
): void {
  const registerBrowserbaseCommands = ({ program }: { program: any }) => {
    const browserbase = program
      .command('browserbase')
      .description('Browserbase plugin setup and credential helpers');

    browserbase
      .command('setup')
      .description('Prompt for Browserbase API key and project ID')
      .option('--api-key <apiKey>', 'Browserbase API key')
      .option('--project-id <projectId>', 'Browserbase project ID')
      .option('-c, --config <path>', 'Override config file path')
      .option(
        '--skip-skills-sync',
        'Skip syncing Browserbase skills from github',
        false
      )
      .option('--skills-dir <path>', 'Override skills target directory')
      .option('--skills-ref <ref>', 'Git ref for browserbase/skills', 'main')
      .action(async (options: any) => {
        const configPath = resolveConfigPath(options.config);
        const shouldSyncSkills = !options.skipSkillsSync;
        const skillsTargetRoot = resolveSkillsRoot(options.skillsDir);
        const skillsRef =
          typeof options.skillsRef === 'string'
            ? options.skillsRef.trim()
            : 'main';
        let rawExisting: Record<string, unknown> = {};
        try {
          rawExisting = readPluginConfig(configPath, PLUGIN_ID);
        } catch (error) {
          logger.warn(
            `browserbase: unable to read ${configPath} (${String((error as Error)?.message ?? error)})`
          );
        }
        const existing = parseConfigSafe(
          rawExisting,
          logger,
          `file ${configPath}`
        );

        const apiKeyFlag =
          typeof options.apiKey === 'string' ? options.apiKey.trim() : '';
        const projectIdFlag =
          typeof options.projectId === 'string' ? options.projectId.trim() : '';

        if (apiKeyFlag && projectIdFlag) {
          if (
            /\$\{[^}]+\}/.test(apiKeyFlag) ||
            /\$\{[^}]+\}/.test(projectIdFlag)
          ) {
            console.warn(
              'Warning: Config contains env var placeholders (${...}). OpenClaw will fail to start if those variables are unset in future sessions.'
            );
          }
          writePluginConfig(configPath, PLUGIN_ID, {
            apiKey: apiKeyFlag,
            projectId: projectIdFlag,
          });

          console.log(`Saved Browserbase credentials to ${configPath}`);
          console.log('Restart OpenClaw to activate remote browsing.');
          if (shouldSyncSkills) {
            await runSkillsSync({
              targetRoot: skillsTargetRoot,
              ref: skillsRef,
              logger,
            });
          }
          return;
        }

        if (!process.stdin.isTTY) {
          console.error(
            'Error: --api-key and --project-id are required in non-interactive mode.'
          );
          process.exit(1);
          return;
        }

        const configured = await promptAndPersistCredentials(
          configPath,
          {
            apiKey: apiKeyFlag || existing.apiKey,
            projectId: projectIdFlag || existing.projectId,
          },
          true
        );

        if (configured && shouldSyncSkills) {
          await runSkillsSync({
            targetRoot: skillsTargetRoot,
            ref: skillsRef,
            logger,
          });
        }
      });

    browserbase
      .command('status')
      .description('Show Browserbase credential status')
      .option('--json', 'Output JSON', false)
      .option('-c, --config <path>', 'Override config file path')
      .action((options: any) => {
        const { configPath, config } = loadMergedConfig(
          api,
          logger,
          options.config
        );
        const configured = Boolean(config.apiKey && config.projectId);

        const payload = {
          configured,
          configPath,
          apiKey: maskSecret(config.apiKey),
          projectId: maskSecret(config.projectId),
          baseUrl: config.baseUrl,
          promptOnStart: config.promptOnStart ?? true,
          autoSyncSkills: config.autoSyncSkills ?? true,
          skillsInstalled: hasBrowserbaseSkills(defaultSkillsRoot()),
          skillsPath: defaultSkillsRoot(),
        };

        if (options.json) {
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        console.log(`Configured: ${configured ? 'yes' : 'no'}`);
        console.log(`Config file: ${configPath}`);
        console.log(`API key: ${payload.apiKey}`);
        console.log(`Project ID: ${payload.projectId}`);
        console.log(`Base URL: ${payload.baseUrl}`);
        console.log(
          `Prompt on startup: ${payload.promptOnStart ? 'yes' : 'no'}`
        );
        console.log(
          `Auto-sync skills: ${payload.autoSyncSkills ? 'yes' : 'no'}`
        );
        console.log(
          `Skills installed: ${payload.skillsInstalled ? 'yes' : 'no'}`
        );
        console.log(`Skills path: ${payload.skillsPath}`);
      });

    const browserbaseSkills = browserbase
      .command('skills')
      .description(
        'Manage Browserbase skills synced from github:browserbase/skills'
      );

    browserbaseSkills
      .command('sync')
      .description('Download/update Browserbase skills into ~/.openclaw/skills')
      .option('--dir <path>', 'Override skills target directory')
      .option('--ref <ref>', 'Git ref for browserbase/skills', 'main')
      .action(async (options: any) => {
        const targetRoot = resolveSkillsRoot(options.dir);
        const ref =
          typeof options.ref === 'string' ? options.ref.trim() : 'main';
        await runSkillsSync({
          targetRoot,
          ref,
          logger,
        });
      });

    browserbaseSkills
      .command('status')
      .description('Check whether Browserbase skills are installed')
      .option('--dir <path>', 'Override skills target directory')
      .option('--json', 'Output JSON', false)
      .action((options: any) => {
        const targetRoot = resolveSkillsRoot(options.dir);
        const installed = hasBrowserbaseSkills(targetRoot);
        const files = installedSkillFiles(targetRoot);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                installed,
                targetRoot,
                files,
              },
              null,
              2
            )
          );
          return;
        }

        console.log(`Installed: ${installed ? 'yes' : 'no'}`);
        console.log(`Target path: ${targetRoot}`);
      });

    browserbase
      .command('env')
      .description('Print Browserbase env vars for shell export')
      .option('-f, --format <format>', 'shell|dotenv|json', 'shell')
      .option('-c, --config <path>', 'Override config file path')
      .action((options: any) => {
        const { config } = loadMergedConfig(api, logger, options.config);

        if (!config.apiKey || !config.projectId) {
          console.error(
            "Browserbase is not configured. Run 'openclaw browserbase setup'."
          );
          process.exit(1);
          return;
        }

        const format = String(options.format ?? 'shell').toLowerCase();

        if (format === 'shell') {
          console.log(
            `export BROWSERBASE_API_KEY=${shellEscape(config.apiKey)}`
          );
          console.log(
            `export BROWSERBASE_PROJECT_ID=${shellEscape(config.projectId)}`
          );
          return;
        }

        if (format === 'dotenv') {
          console.log(`BROWSERBASE_API_KEY=${dotenvEscape(config.apiKey)}`);
          console.log(
            `BROWSERBASE_PROJECT_ID=${dotenvEscape(config.projectId)}`
          );
          return;
        }

        if (format === 'json') {
          console.log(
            JSON.stringify(
              {
                BROWSERBASE_API_KEY: config.apiKey,
                BROWSERBASE_PROJECT_ID: config.projectId,
              },
              null,
              2
            )
          );
          return;
        }

        console.error(`Unknown format: ${format}. Use shell, dotenv, or json.`);
        process.exit(1);
      });

    browserbase
      .command('where')
      .description('Show the config file path used by setup')
      .option('-c, --config <path>', 'Override config file path')
      .action((options: any) => {
        console.log(resolveConfigPath(options.config));
      });
  };

  api.registerCli(registerBrowserbaseCommands, { commands: ['browserbase'] });
}

let didStartupPrompt = false;

async function maybePromptOnStartup(
  api: OpenClawPluginApi,
  logger: OpenClawPluginApi['logger']
): Promise<void> {
  if (didStartupPrompt) {
    return;
  }

  didStartupPrompt = true;

  const { configPath, config } = loadMergedConfig(api, logger);
  const managedSkillsRoot = defaultSkillsRoot();

  if (
    (config.autoSyncSkills ?? true) &&
    !hasBrowserbaseSkills(managedSkillsRoot)
  ) {
    logger.info(
      `browserbase: Browserbase skills not found in ${managedSkillsRoot}; syncing from browserbase/skills`
    );
    await runSkillsSync({
      targetRoot: managedSkillsRoot,
      ref: 'main',
      logger,
      silent: true,
    });
  }

  if (config.apiKey && config.projectId) {
    // Bridge config → env so browse CLI auto-detects remote mode.
    // Child processes (Bash tool) inherit process.env.
    process.env.BROWSERBASE_API_KEY = config.apiKey;
    process.env.BROWSERBASE_PROJECT_ID = config.projectId;
    logger.info('browserbase: credentials loaded');
    return;
  }

  if (!(config.promptOnStart ?? true)) {
    logger.warn(
      "browserbase: missing credentials. Run 'openclaw browserbase setup'."
    );
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    logger.warn(
      "browserbase: missing credentials in non-interactive mode. Run 'openclaw browserbase setup'."
    );
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const shouldSetup = await promptYesNo(
      rl,
      '\nBrowserbase is not configured. Configure now? [Y/n]: ',
      true
    );

    if (!shouldSetup) {
      logger.warn(
        "browserbase: setup skipped. Run 'openclaw browserbase setup' later."
      );
      return;
    }
  } finally {
    rl.close();
  }

  const configured = await promptAndPersistCredentials(
    configPath,
    { apiKey: config.apiKey, projectId: config.projectId },
    true
  );

  if (configured && (config.autoSyncSkills ?? true)) {
    await runSkillsSync({
      targetRoot: managedSkillsRoot,
      ref: 'main',
      logger,
      silent: true,
    });
  }
}

export default {
  id: PLUGIN_ID,
  name: 'Browserbase',
  description:
    'Browse the web with anti-bot stealth, automatic CAPTCHA solving, and residential proxies via Browserbase',
  kind: 'tool' as const,
  configSchema: browserbaseConfigSchema,
  register(api: OpenClawPluginApi) {
    const logger = createLogger(api);
    registerCli(api, logger);

    const runStartup = () => {
      maybePromptOnStartup(api, logger).catch((err: unknown) => {
        logger.warn(
          `browserbase: startup check failed (${String((err as Error)?.message ?? err)})`
        );
      });
    };

    if (typeof api.registerService === 'function') {
      api.registerService({
        id: 'browserbase-startup-check',
        start: runStartup,
        stop: () => {},
      });
      return;
    }

    runStartup();
  },
};
