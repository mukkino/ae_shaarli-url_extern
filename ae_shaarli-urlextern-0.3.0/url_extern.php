<?php
/**
 * AE URL Extern plugin for Shaarli.
 *
 * Version 0.3.0
 *
 * Fabio Lichinchi (mukka) - https://alterego.cc/
 *
 * Configurable external-link target plugin for Shaarli v0.16.x.
 *
 * Opens external HTTP/HTTPS links in a new tab, with same-window exceptions,
 * forced-new-tab rules, per-link opt out, and configurable focus behaviour.
 *
 * Configure from:
 *   Tools -> Plugin administration -> url_extern parameters
 *
 * SPDX-License-Identifier: Unlicense
 */

function url_extern_conf($conf, $key, $default)
{
    try {
        if (is_object($conf) && method_exists($conf, 'get')) {
            $value = $conf->get('plugins.' . $key, $default);

            if ($value !== null && $value !== '') {
                if (is_bool($value)) {
                    return $value ? '1' : '0';
                }

                if (is_scalar($value)) {
                    return (string) $value;
                }
            }
        }
    } catch (Exception $e) {
        return $default;
    } catch (Throwable $e) {
        return $default;
    }

    return $default;
}

function url_extern_bool($value, $default)
{
    if (is_bool($value)) {
        return $value;
    }

    if ($value === null) {
        return $default;
    }

    $value = strtolower(trim((string) $value));

    if (in_array($value, array('1', 'true', 'yes', 'y', 'on', 'enabled'), true)) {
        return true;
    }

    if (in_array($value, array('0', 'false', 'no', 'n', 'off', 'disabled'), true)) {
        return false;
    }

    return $default;
}

function url_extern_allow($value, array $allowed, $default)
{
    $value = strtolower(trim((string) $value));

    return in_array($value, $allowed, true) ? $value : $default;
}

function url_extern_allowed_focus($focus)
{
    return url_extern_allow(
        $focus,
        array(
            'new',
            'current',
        ),
        'new'
    );
}

function url_extern_split_patterns($raw)
{
    if (!is_scalar($raw)) {
        return array();
    }

    $raw = str_replace(array("\r\n", "\r", "\n", ';'), ',', (string) $raw);
    $parts = preg_split('/\s*,\s*/', $raw, -1, PREG_SPLIT_NO_EMPTY);

    if ($parts === false) {
        return array();
    }

    $patterns = array();

    foreach ($parts as $part) {
        $part = trim($part);
        $part = trim($part, "\t\n\r\0\x0B\"'");

        if ($part === '') {
            continue;
        }

        if (!in_array($part, $patterns, true)) {
            $patterns[] = $part;
        }
    }

    return $patterns;
}

function url_extern_clean_patterns($raw)
{
    return implode(', ', url_extern_split_patterns($raw));
}

function url_extern_settings($conf)
{
    $enabled = url_extern_bool(
        url_extern_conf($conf, 'URL_EXTERN_ENABLED', '1'),
        true
    );

    $exceptions = url_extern_split_patterns(
        url_extern_conf($conf, 'URL_EXTERN_EXCEPTIONS', '')
    );

    $forceNewTab = url_extern_split_patterns(
        url_extern_conf($conf, 'URL_EXTERN_FORCE_NEW_TAB', '')
    );

    $newTabFocus = url_extern_allowed_focus(
        url_extern_conf($conf, 'URL_EXTERN_NEW_TAB_FOCUS', 'new')
    );

    $respectExplicitTargets = url_extern_bool(
        url_extern_conf($conf, 'URL_EXTERN_RESPECT_EXPLICIT_TARGETS', '0'),
        false
    );

    return array(
        'enabled' => $enabled,
        'exceptions' => $exceptions,
        'forceNewTab' => $forceNewTab,
        'newTabFocus' => $newTabFocus,
        'respectExplicitTargets' => $respectExplicitTargets,
    );
}

/**
 * Validate/sanitise parameters when saved in Shaarli's plugin admin.
 *
 * @param array $data POST data.
 * @return array Sanitised POST data.
 */
function hook_url_extern_save_plugin_parameters($data)
{
    if (isset($data['URL_EXTERN_ENABLED'])) {
        $data['URL_EXTERN_ENABLED'] = url_extern_bool($data['URL_EXTERN_ENABLED'], true) ? '1' : '0';
    }

    if (isset($data['URL_EXTERN_EXCEPTIONS'])) {
        $data['URL_EXTERN_EXCEPTIONS'] = url_extern_clean_patterns($data['URL_EXTERN_EXCEPTIONS']);
    }

    if (isset($data['URL_EXTERN_FORCE_NEW_TAB'])) {
        $data['URL_EXTERN_FORCE_NEW_TAB'] = url_extern_clean_patterns($data['URL_EXTERN_FORCE_NEW_TAB']);
    }

    if (isset($data['URL_EXTERN_NEW_TAB_FOCUS'])) {
        $data['URL_EXTERN_NEW_TAB_FOCUS'] = url_extern_allowed_focus($data['URL_EXTERN_NEW_TAB_FOCUS']);
    }

    if (isset($data['URL_EXTERN_RESPECT_EXPLICIT_TARGETS'])) {
        $data['URL_EXTERN_RESPECT_EXPLICIT_TARGETS'] = url_extern_bool(
            $data['URL_EXTERN_RESPECT_EXPLICIT_TARGETS'],
            false
        ) ? '1' : '0';
    }

    return $data;
}

/**
 * Add the JavaScript configuration and behaviour.
 *
 * @param array $data Template data.
 * @param mixed $conf Config manager.
 * @return array
 */
function hook_url_extern_render_footer($data, $conf)
{
    $settings = url_extern_settings($conf);

    if ($settings['enabled'] === false) {
        return $data;
    }

    $json = json_encode(
        $settings,
        JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE
        | JSON_HEX_TAG
        | JSON_HEX_AMP
        | JSON_HEX_APOS
        | JSON_HEX_QUOT
    );

    if ($json === false) {
        $json = '{"enabled":true,"exceptions":[],"forceNewTab":[],"newTabFocus":"new","respectExplicitTargets":false}';
    }

    if (!isset($data['endofpage']) || !is_array($data['endofpage'])) {
        $data['endofpage'] = array();
    }

    if (!isset($data['js_files']) || !is_array($data['js_files'])) {
        $data['js_files'] = array();
    }

    $data['endofpage'][] = '<script type="application/json" id="url-extern-config">'
        . $json
        . '</script>';

    $data['js_files'][] = 'plugins/url_extern/url_extern_030.js';

    return $data;
}

/**
 * This function is never called, but contains translation calls for GNU gettext extraction.
 */
function url_extern_translation()
{
    // meta
    t('Opens external Shaarli links in a new tab, with same-window exceptions, forced-new-tab overrides, focus behaviour and opt-out support.');
    t('Enable behaviour while the plugin itself is active. Use 1/true/on/yes to enable, 0/false/off/no to disable. Default: 1');
    t('Comma-separated same-window exceptions. Supports domains, hosts with ports, URL patterns and wildcards. Examples: example.org, *.example.com, https://docs.example.net/manual/*');
    t('Comma-separated URLs/domains that must open in a new tab even if they also match the exception list. Supports the same pattern syntax.');
    t('New-tab focus behaviour: new or current. Use new to let the browser move focus to the opened tab, or current to try to keep focus on Shaarli. Default: new');
    t('Do not override links that already have a target attribute. Use 1/true/on/yes to respect existing targets, 0/false/off/no to force plugin behaviour. Default: 0');
}
