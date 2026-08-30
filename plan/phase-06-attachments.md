# Phase 6 — Attachments

**Size:** M
**Depends on:** Phase 5
**Goal:** a photo taken offline uploads on reconnection, and signed URLs expire
as configured.

## Tasks

### Schema
- [ ] `attachments` — business, entity type/id, uploader, MIME, size, key,
      category, caption, thumbnail key

### API
- [ ] `platform/storage` abstraction (MinIO local, S3/R2 production)
- [ ] Presigned PUT — permission-checked, content-type and size constrained
- [ ] Confirm endpoint writes the row; orphan objects GC'd by a job
- [ ] Presigned GET — short TTL, issued only after the permission check
- [ ] Storage keys include `business_id` and are random
- [ ] Server-side content-type validation (do not trust the client)
- [ ] Delete — permission-gated and audited
- [ ] Thumbnail worker (BullMQ)

### Mobile
- [ ] Camera and gallery capture (expo-camera, expo-image-picker)
- [ ] Compression ~1600px long edge / ~80%, with an **original quality** toggle
- [ ] Upload queue with progress, retry, visible failed queue
- [ ] Offline capture → delayed upload; photos queue **separately** from records
- [ ] Full-screen viewer with zoom and swipe
- [ ] Category and caption on save

### Tests
- [ ] Signed URL expires at the configured TTL
- [ ] No public object access
- [ ] Offline capture uploads on reconnection
- [ ] Deleting financial evidence is blocked without permission, and audited
- [ ] A compressed invoice is still readable (manual check, recorded)

## Exit criteria

- [ ] Photo taken in aircraft mode uploads when connectivity returns
- [ ] A record syncs immediately while its photo is still queued
- [ ] Bucket has no public objects; all access is signed
- [ ] Upload failure surfaces in a visible retry queue, not silently
