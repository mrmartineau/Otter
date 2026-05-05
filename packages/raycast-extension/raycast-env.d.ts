/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OAuth Client ID - Your Raycast OAuth client ID from Otter */
  "oauthClientId": string,
  /** Otter Instance URL - e.g. https://otter.zander.wtf */
  "otterBasePath": string,
  /** Show Detail View to Side or List View - Show detail view to side or list view */
  "showDetailView": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `recent` command */
  export type Recent = ExtensionPreferences & {}
  /** Preferences accessible in the `add` command */
  export type Add = ExtensionPreferences & {}
  /** Preferences accessible in the `menubar` command */
  export type Menubar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `recent` command */
  export type Recent = {}
  /** Arguments passed to the `add` command */
  export type Add = {}
  /** Arguments passed to the `menubar` command */
  export type Menubar = {}
}

