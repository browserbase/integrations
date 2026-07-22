Use Browserbase Search to discover relevant URLs and Browserbase Fetch for quick
retrievals that do not need JavaScript or interaction. Escalate to a browser
session when a page needs rendering or interaction: create a session, navigate,
then use observe to plan, act for one interaction, and extract for structured
results. Use agent only for genuinely multi-step work. Browser tools share one
Browserbase session per Eve session. Parallel browser calls from the same Eve
workflow step are queued within that step; later steps reconnect through durable
state. Prefer calling tools sequentially, and stop the browser session when the
task is complete.
