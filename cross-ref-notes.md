# Cross-Reference Doc Implementation Notes

## Database (drizzle/schema.ts, lines 46-53)
- `referenceDocS3Key` - S3 key for backup storage
- `referenceDocName` - Original filename for display
- `referenceDocLength` - Character count
- `referenceDocContent` - Full content in DB (mediumtext, source of truth)

## Backend (server/routers.ts)
- `crossCheck.getReferenceDoc` (line 1637) - Reads from DB first, falls back to S3
- `crossCheck.updateReferenceDoc` (line 1688) - Saves to DB (primary) + S3 (backup)
- `crossCheck.checkArticle` (line 1720) - Uses referenceDocContent for cross-checking articles

## DB Helper (server/db.ts, line 427)
- `updateProjectReferenceDocMeta(projectId, s3Key, docName, docLength, docContent)` - Updates all 4 fields

## Frontend (client/src/pages/ProjectSettings.tsx)
- `CrossCheckTab` component (line 1028) - Full UI for managing reference doc
- Uses `trpc.crossCheck.getReferenceDoc.useQuery` and `trpc.crossCheck.updateReferenceDoc.useMutation`
- Tab rendered at line 1841: `{activeTab === "crosscheck" && <CrossCheckTab projectId={activeProjectId} />}`

## Article Generation Usage
- Need to check how article generation reads the reference doc
