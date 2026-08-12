# Skill Reference Media Materialization Design

## Problem

Canvas image assets can contain a complete `data:image/...;base64,...` value in
`content`, `file_path`, `url`, and `thumbnail`. The current Skill preview route
allows the `data:` scheme but caps every incoming asset URL at 64 KiB. A normal
generated image is much larger (the reproduced JPEG is about 944 KiB), so Chat
Skill compilation fails with `assets[0].url exceeds the allowed length`.

Increasing the URL limit is not sufficient: up to nine reference images can
also exceed the server's global 5 MiB JSON body limit and would repeatedly send
large Base64 strings through preview and generation requests.

## Design

Add a GenerateNode reference-media materialization step before any Skill
compiler or generation request:

- Keep existing HTTPS and `/api/assets/media/` or `/api/files/` references.
- Fetch `data:image/...` and `blob:` references in the browser and upload their
  bytes through the existing `/api/assets/upload/image` endpoint.
- Replace only the reference URL with the returned local media path normalized
  as `/api/assets/media/...`.
- Preserve reference order, role, ID, index, source lineage, and all other
  compiler metadata.
- Cache the materialized path by original URL for the lifetime of the node so
  preview, Chat compilation, and formal generation reuse one upload.
- Coalesce concurrent materializations for the same URL so repeated user
  actions cannot create duplicate uploads.

The same image materializer is used before saving a newly generated Base64
image as an asset. The asset record then stores the short media path in
`content`, `file_path`, `url`, and `thumbnail` instead of embedding image bytes.
Legacy Base64 assets remain readable and require no manual migration: their
first use as a reference materializes a short path for the active node.

## Data Flow

1. React Flow resolves ordered incoming reference bindings.
2. Existing reference validation enforces the nine-image limit and role rules.
3. The materializer uploads only `data:image` and `blob:` image references.
4. The preview compiler request or formal generation payload receives the
   materialized bindings.
5. Compiler provenance and cache hashing use the actual short paths sent to the
   server.

## Error Handling and Safety

- A failed fetch, unsupported fetched media type, malformed Data URL, or upload
  failure aborts preview/generation and surfaces a typed reference-media error.
- The client does not fall back to sending an oversized Base64 JSON body.
- Server URL limits and URL-scheme allow-lists remain unchanged.
- Only image references are materialized in this change; existing reserved
  video/audio execution behavior remains unchanged.
- Materialized local files are created through the existing bounded upload
  route and workspace path-safety implementation.

## Testing

Add test-first coverage proving that:

1. Data and Blob image references become short local media paths.
2. Nine ordered references retain order, roles, IDs, and source lineage.
3. Duplicate and concurrent input URLs upload once and reuse the result.
4. HTTPS and existing local media references are unchanged.
5. Upload failures abort without producing a Base64 compiler request.
6. Saving a generated Base64 image stores only the materialized path.
7. GenerateNode, Skill route, and server/web build suites remain green.

## Scope

This change applies to Canvas GenerateNode reference compilation and generated
image asset saving. It does not change the novel workspace, Skill Pack format,
server request limits, or existing video/audio execution policy.
