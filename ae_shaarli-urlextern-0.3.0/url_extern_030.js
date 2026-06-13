(function () {
    "use strict";

    var CONFIG_ID = "url-extern-config";
    var DATA_PROCESSED = "urlExternProcessed";
    var DATA_MANAGED = "urlExternManaged";
    var DATA_NEW_TAB = "urlExternNewTab";
    var DATA_FOCUS = "urlExternFocus";
    var IGNORE_SELECTOR = "[data-url-extern=\"ignore\"], [data-url-extern-ignore]";
    var CLICK_HANDLER_ATTACHED = false;

    function ready(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    function cleanPatternList(values) {
        var result = [];

        for (var i = 0; i < values.length; i += 1) {
            var pattern = String(values[i] || "").trim();

            if (pattern && result.indexOf(pattern) === -1) {
                result.push(pattern);
            }
        }

        return result;
    }

    function readConfig() {
        var config = {
            enabled: true,
            exceptions: [],
            forceNewTab: [],
            newTabFocus: "new",
            respectExplicitTargets: false
        };

        var element = document.getElementById(CONFIG_ID);

        if (!element) {
            return config;
        }

        try {
            var parsed = JSON.parse(element.textContent || "{}");

            if (typeof parsed.enabled === "boolean") {
                config.enabled = parsed.enabled;
            }

            if (Array.isArray(parsed.exceptions)) {
                config.exceptions = cleanPatternList(parsed.exceptions);
            }

            if (Array.isArray(parsed.forceNewTab)) {
                config.forceNewTab = cleanPatternList(parsed.forceNewTab);
            }

            if (parsed.newTabFocus === "current") {
                config.newTabFocus = "current";
            }

            if (typeof parsed.respectExplicitTargets === "boolean") {
                config.respectExplicitTargets = parsed.respectExplicitTargets;
            }
        } catch (error) {
            // Invalid configuration should never break Shaarli.
        }

        return config;
    }

    function normalizePattern(pattern) {
        return String(pattern || "")
            .trim()
            .replace(/^["']+|["']+$/g, "")
            .replace(/\s+/g, "")
            .toLowerCase();
    }

    function escapeRegex(value) {
        return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }

    function wildcardMatch(pattern, value) {
        pattern = normalizePattern(pattern);
        value = String(value || "").toLowerCase();

        if (!pattern) {
            return false;
        }

        var regex = "^" + escapeRegex(pattern).replace(/\*/g, ".*") + "$";
        return new RegExp(regex, "i").test(value);
    }

    function isBareHostPattern(pattern) {
        return pattern.indexOf("://") === -1
            && pattern.indexOf("/") === -1
            && pattern.indexOf("*") === -1;
    }

    function hostMatchesBarePattern(url, pattern) {
        pattern = normalizePattern(pattern);

        if (!pattern) {
            return false;
        }

        var host = url.host.toLowerCase();
        var hostname = url.hostname.toLowerCase();

        if (host === pattern || hostname === pattern) {
            return true;
        }

        if (pattern.indexOf(":") !== -1) {
            return false;
        }

        // A bare domain such as example.org is treated as example.org plus subdomains.
        return hostname.length > pattern.length && hostname.endsWith("." + pattern);
    }

    function matchesPattern(url, pattern) {
        pattern = normalizePattern(pattern);

        if (!pattern) {
            return false;
        }

        if (isBareHostPattern(pattern)) {
            return hostMatchesBarePattern(url, pattern);
        }

        var href = url.href.toLowerCase();
        var host = url.host.toLowerCase();
        var hostname = url.hostname.toLowerCase();
        var hostAndPath = (url.host + url.pathname + url.search + url.hash).toLowerCase();

        if (pattern.indexOf("://") !== -1) {
            return wildcardMatch(pattern, href);
        }

        return wildcardMatch(pattern, hostAndPath)
            || wildcardMatch(pattern, host)
            || wildcardMatch(pattern, hostname);
    }

    function matchesAnyPattern(url, patterns) {
        for (var i = 0; i < patterns.length; i += 1) {
            if (matchesPattern(url, patterns[i])) {
                return true;
            }
        }

        return false;
    }

    function isHttpUrl(url) {
        return url.protocol === "http:" || url.protocol === "https:";
    }

    function isSameOrigin(url) {
        return url.origin === window.location.origin;
    }

    function addRelToken(anchor, token) {
        var rel = (anchor.getAttribute("rel") || "")
            .split(/\s+/)
            .filter(Boolean);

        if (rel.indexOf(token) === -1) {
            rel.push(token);
        }

        anchor.setAttribute("rel", rel.join(" "));
    }

    function markForNewTab(anchor, focusMode) {
        anchor.setAttribute("target", "_blank");
        anchor.dataset[DATA_MANAGED] = "1";
        anchor.dataset[DATA_NEW_TAB] = "1";
        anchor.dataset[DATA_FOCUS] = focusMode || "new";
        addRelToken(anchor, "noopener");
        addRelToken(anchor, "noreferrer");
    }

    function markForSameWindow(anchor) {
        anchor.setAttribute("target", "_self");
        anchor.dataset[DATA_MANAGED] = "1";
        delete anchor.dataset[DATA_NEW_TAB];
        delete anchor.dataset[DATA_FOCUS];
    }

    function clearManaged(anchor) {
        if (anchor.dataset[DATA_MANAGED] !== "1") {
            return;
        }

        anchor.removeAttribute("target");
        delete anchor.dataset[DATA_MANAGED];
        delete anchor.dataset[DATA_NEW_TAB];
        delete anchor.dataset[DATA_FOCUS];
    }

    function shouldSkipAnchor(anchor, config) {
        if (!anchor || anchor.dataset[DATA_PROCESSED] === "1") {
            return true;
        }

        if (anchor.matches && anchor.matches(IGNORE_SELECTOR)) {
            return true;
        }

        if (anchor.hasAttribute("download")) {
            return true;
        }

        if (
            config.respectExplicitTargets
            && anchor.hasAttribute("target")
            && anchor.dataset[DATA_MANAGED] !== "1"
        ) {
            return true;
        }

        return false;
    }

    function applyToAnchor(anchor, config) {
        if (shouldSkipAnchor(anchor, config)) {
            return;
        }

        anchor.dataset[DATA_PROCESSED] = "1";

        var rawHref = anchor.getAttribute("href");
        var url;

        if (!rawHref) {
            clearManaged(anchor);
            return;
        }

        try {
            url = new URL(rawHref, window.location.href);
        } catch (error) {
            clearManaged(anchor);
            return;
        }

        if (!isHttpUrl(url)) {
            clearManaged(anchor);
            return;
        }

        // Explicit new-tab rules win over same-window exceptions and same-origin links.
        if (matchesAnyPattern(url, config.forceNewTab)) {
            markForNewTab(anchor, config.newTabFocus);
            return;
        }

        if (isSameOrigin(url)) {
            clearManaged(anchor);
            return;
        }

        if (matchesAnyPattern(url, config.exceptions)) {
            markForSameWindow(anchor);
            return;
        }

        markForNewTab(anchor, config.newTabFocus);
    }

    function applyToRoot(root, config) {
        if (!root || !config.enabled) {
            return;
        }

        if (root.nodeType === 1 && root.tagName && root.tagName.toLowerCase() === "a") {
            applyToAnchor(root, config);
        }

        var links = root.querySelectorAll ? root.querySelectorAll("a[href]") : [];

        for (var i = 0; i < links.length; i += 1) {
            applyToAnchor(links[i], config);
        }
    }

    function isPlainLeftClick(event) {
        return !event.defaultPrevented
            && event.button === 0
            && !event.metaKey
            && !event.ctrlKey
            && !event.shiftKey
            && !event.altKey;
    }

    function closestManagedLink(element) {
        if (!element) {
            return null;
        }

        if (element.nodeType !== 1) {
            element = element.parentElement;
        }

        if (!element || !element.closest) {
            return null;
        }

        return element.closest("a[data-url-extern-new-tab=\"1\"]");
    }

    function openInBackground(anchor) {
        var opened = window.open(anchor.href, "_blank", "noopener,noreferrer");

        if (opened && typeof opened.blur === "function") {
            try {
                opened.blur();
            } catch (error) {
                // Browser focus policies win.
            }
        }

        try {
            window.focus();
        } catch (error) {
            // Browser focus policies win.
        }
    }

    function attachClickHandler() {
        if (CLICK_HANDLER_ATTACHED) {
            return;
        }

        CLICK_HANDLER_ATTACHED = true;

        document.addEventListener("click", function (event) {
            var anchor = closestManagedLink(event.target);

            if (!anchor) {
                return;
            }

            if ((anchor.dataset[DATA_FOCUS] || "new") !== "current") {
                return;
            }

            if (!isPlainLeftClick(event)) {
                return;
            }

            event.preventDefault();
            openInBackground(anchor);
        }, false);
    }

    function observeDynamicLinks(config) {
        if (!window.MutationObserver || !config.enabled) {
            return;
        }

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === "attributes") {
                    if (mutation.target
                        && mutation.target.tagName
                        && mutation.target.tagName.toLowerCase() === "a") {
                        delete mutation.target.dataset[DATA_PROCESSED];
                        applyToAnchor(mutation.target, config);
                    }
                    return;
                }

                mutation.addedNodes.forEach(function (node) {
                    applyToRoot(node, config);
                });
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["href"],
            childList: true,
            subtree: true
        });
    }

    ready(function () {
        var config = readConfig();

        if (!config.enabled) {
            return;
        }

        applyToRoot(document, config);
        attachClickHandler();
        observeDynamicLinks(config);
    });
}());
