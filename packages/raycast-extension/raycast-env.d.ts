/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Email - Your email on otter.zander.wtf */
  "loginEmail": string,
  /** Password - Your password on otter.zander.wtf */
  "loginPassword": string,
  /** Otter Instance URL - e.g. https://otter.zander.wtf */
  "otterBasePath": string,
  /** Supabase Project URL - Find this in your Supabase project API settings. e.g. https://ffpbylcvwtyozyrplqic.supabase.co */
  "supabaseUrl": string,
  /** Supabase Anon API Key - Find this in your Supabase project API settings */
  "supabaseAnonKey": string,
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

