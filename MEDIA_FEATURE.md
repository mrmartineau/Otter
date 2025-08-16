Using the `media` table in the Supabase database, generate a new page (called `media.tsx`) in the `_app` directory that manages media items. I want to display 4 columns (like a kanban board) that represent one of the `media_status` enum values. Create a new `media.ts` file in the `utils/fetching` directory that follow existing conventions for data fetching, e.g. a fetch function called `getMedia` and a React Query function called `getMediaOptions` that is to be used on this new page - only `active` items are to be shown. There should also be a mutation hooks so that items can be created and updated.

Items in the 4 columns can be dragged from one column to the next using React DND kit library (`@dnd-kit/core`, @https://dndkit.com/ , @https://github.com/clauderic/dnd-kit ). When items are reordered in a column,

A series of filters above the columns will help filter the view:

- an input field to filter the view by `platform`, `type` and `name`
- radio buttons to filter by `type`

New items can be added by clicking a button above the columns. When this is clicked a `Dialog` component appears from the right (like when editing a bookmark), this will have a form to add new items. The fields in the form should be:

- `type`: radio buttons with values from the `media_type` enum
- `name` - text input field
- `platform` - a react select field (like what is used for tags in the `BookmarkForm.tsx` component
- `media_id`: text input field
- `status`: select input with values from the `media_status` enum
- `rating`: radio buttons with values from the `media_rating` enum

A new sidebar link should also be added with the `ApertureIcon` from Phosphor icons with the text: "Media"

Use the conventions that the app has right now.
