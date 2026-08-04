# Stagehand V4 code-mode syntax

You have one `code_execute` tool. Its `code` argument is the body of an async JavaScript function,
not a complete program. Write direct `await` statements and finish with a JSON-serializable return
value.

The following objects are already in scope:

- `page`: the active Stagehand `Page`.
- `context`: the Stagehand `BrowserContext` shared across calls.
- `stagehand`: the Stagehand AI methods `act`, `observe`, and `extract`.
- `z`: Zod V4, for `stagehand.extract` schemas.
- `console`: captured `log`, `warn`, and `error` methods.

Do not import packages, read environment variables, construct Stagehand, call `stagehand.init()`, or
close the page/browser. The tool process owns initialization and cleanup.

## Direct browser syntax

Use deterministic page and locator methods when you know the target:

```js
await page.goto('https://example.com', { waitUntil: 'load' });
const heading = await page.locator('h1').innerText();
const visible = await page.locator('a').first().isVisible();
return { heading, visible, url: await page.url(), title: await page.title() };
```

Common page methods include `goto`, `reload`, `goBack`, `goForward`, `click`, `hover`, `scroll`,
`dragAndDrop`, `type`, `keyPress`, `evaluate`, `waitForLoadState`, `waitForTimeout`,
`waitForSelector`, `screenshot`, `snapshot`, `url`, `title`, and `locator`.

Common locator methods include `click`, `hover`, `fill`, `count`, `isChecked`, `inputValue`,
`isVisible`, `innerText`, `innerHtml`, `textContent`, `scrollTo`, `type`, `selectOption`, `first`,
and `nth`.

## Stagehand AI syntax

Use `act` for an interaction described in natural language:

```js
const result = await stagehand.act('Click the sign-in button');
if (!result.success) throw new Error(result.message);
return result;
```

Use `observe` to find candidate actions without performing them:

```js
const actions = await stagehand.observe('Find the checkout button');
return { actions };
```

Use `extract` with a Zod schema for structured page data:

```js
const product = await stagehand.extract(
  'Extract the product name and price',
  z.object({ name: z.string(), price: z.string() })
);
return product;
```

Pass `{ page: anotherPage }` as the final options object to `act`, `observe`, or `extract` when the
active page is not the intended target.

## Pages and state across calls

```js
const pages = await context.pages();
const secondPage = pages[1] ?? (await context.newPage());
await context.setActivePage(secondPage);
return {
  pageCount: (await context.pages()).length,
  activeUrl: await secondPage.url(),
};
```

The same browser, pages, cookies, and navigation state persist across successful tool calls. Local
JavaScript variables do not persist, so rediscover pages and elements each call. A timeout or abort
returns `browser_state: "discarded"`; the next call starts a new browser.

## Return discipline

Return only the compact evidence needed by the agent. Prefer strings, numbers, booleans, arrays,
and plain objects. Do not return page, locator, context, Stagehand, or Zod objects. Await asynchronous
methods before returning. Logs and oversized return values are bounded by the executor.
