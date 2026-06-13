# AE URL Extern for Shaarli

Version 0.3.0

Configurable external-link target plugin for Shaarli v0.16.x.

This version opens external links in a new tab, allows selected URLs to stay in the same tab, allows selected URLs to force new-tab behaviour even when they also match the exception list, and lets you choose the preferred focus behaviour.

Fabio Lichinchi (mukka), https://alterego.cc/, 13th of June 2026

## Install

Upload the folder:

    url_extern

to:

    /public_html/shaarli/plugins/url_extern/

Then enable it in Shaarli:

    Tools → Plugin administration

After installing/updating, clear compiled template files inside:

    /public_html/shaarli/tmp/

Do not delete the `tmp` folder itself.

Disable any other external-link/new-tab plugin before enabling this one, otherwise two plugins may try to change the same links.

## Configure

In Shaarli:

    Tools → Plugin administration → url_extern parameters

Set:

### URL_EXTERN_ENABLED

Enable or disable the behaviour while the plugin itself remains active.

Enabled values:

    1
    true
    yes
    on
    enabled

Disabled values:

    0
    false
    no
    off
    disabled

Recommended default:

    1

### URL_EXTERN_EXCEPTIONS

Comma-separated list of URLs, domains, hosts or wildcard patterns that should stay in the same tab instead of opening in a new tab.

Examples:

    example.org
    *.example.com
    https://docs.example.net/manual/*
    localhost:8080

Supported forms:

    example.org
    *.example.org
    example.org/docs/*
    https://example.org/docs/*
    localhost:8080

A plain domain such as `example.org` matches both `example.org` and subdomains such as `www.example.org` or `docs.example.org`.

### URL_EXTERN_FORCE_NEW_TAB

Comma-separated list of URLs, domains, hosts or wildcard patterns that must open in a new tab.

This wins over `URL_EXTERN_EXCEPTIONS`.

Example:

    example.org/downloads/*, https://docs.example.net/private/*

With this configuration:

    URL_EXTERN_EXCEPTIONS: example.org
    URL_EXTERN_FORCE_NEW_TAB: example.org/downloads/*

Most `example.org` links stay in the same tab, but `example.org/downloads/*` links open in a new tab.

This list can also force same-origin `http://` or `https://` links into a new tab when you explicitly add them.

### URL_EXTERN_NEW_TAB_FOCUS

Allowed values:

    new
    current

Recommended default:

    new

Use:

    new

to let the browser move focus to the opened tab/window.

Use:

    current

to try to keep focus on the current Shaarli tab after opening the link.

Browser and user settings can still override focus behaviour.

### URL_EXTERN_RESPECT_EXPLICIT_TARGETS

Set this to `1` if you do not want the plugin to change links that already have a `target` attribute.

Default:

    0

Meaning:

    0 = enforce plugin behaviour
    1 = leave links with an existing target alone

## Pattern priority

Rules are applied in this order:

    URL_EXTERN_FORCE_NEW_TAB
    internal Shaarli links
    URL_EXTERN_EXCEPTIONS
    default external-link behaviour

So the explicit new-tab list always wins over the same-tab exception list.

## Per-link opt out

Theme or custom HTML authors can opt out a single link with either of these attributes:

```html
<a href="https://example.org" data-url-extern="ignore">Example</a>
<a href="https://example.org" data-url-extern-ignore>Example</a>
```

## Good default examples

Open all external links in a new tab:

    URL_EXTERN_ENABLED: 1
    URL_EXTERN_EXCEPTIONS:
    URL_EXTERN_FORCE_NEW_TAB:
    URL_EXTERN_NEW_TAB_FOCUS: new
    URL_EXTERN_RESPECT_EXPLICIT_TARGETS: 0

Open external links in a new tab, but keep a documentation site in the same tab:

    URL_EXTERN_ENABLED: 1
    URL_EXTERN_EXCEPTIONS: docs.example.org
    URL_EXTERN_FORCE_NEW_TAB:
    URL_EXTERN_NEW_TAB_FOCUS: new
    URL_EXTERN_RESPECT_EXPLICIT_TARGETS: 0

Keep a domain in the same tab, except a specific section:

    URL_EXTERN_ENABLED: 1
    URL_EXTERN_EXCEPTIONS: example.org
    URL_EXTERN_FORCE_NEW_TAB: example.org/downloads/*
    URL_EXTERN_NEW_TAB_FOCUS: new
    URL_EXTERN_RESPECT_EXPLICIT_TARGETS: 0

Try to keep Shaarli focused after opening new tabs:

    URL_EXTERN_ENABLED: 1
    URL_EXTERN_EXCEPTIONS:
    URL_EXTERN_FORCE_NEW_TAB:
    URL_EXTERN_NEW_TAB_FOCUS: current
    URL_EXTERN_RESPECT_EXPLICIT_TARGETS: 0

## License

The Unlicense.
