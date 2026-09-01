# Workspace Rules & URL Capabilities

## Always Look Up URLs
- Whenever the user references a URL or asks to inspect/analyze an external link, documentation, GitHub repo, or web recipe, **always proactively look up the URL**.
- Use `read_url_content` for fast text/markdown extraction of public web pages.
- Use `browsermcp` (`browser_navigate`, `browser_snapshot`, `browser_screenshot`) when rendering JavaScript-heavy pages, interacting with web interfaces, or capturing live browser state.
- Use `search_web` to discover up-to-date documentation and online resources.
