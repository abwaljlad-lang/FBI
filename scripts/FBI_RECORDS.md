# FBI records Discord panel

The `/fbi-records` command posts a public Components V2 panel with three private forms:

- **Witness statement:** name, age, occupation, and full statement.
- **Evidence:** name, description, and how it was obtained. The bot then asks for one JPG, PNG, or WEBP image in the submitter's Discord DM. The image is stored in MongoDB GridFS.
- **Confidential informant:** real name, age, assigned tasks, start time, and end time.

Form replies are private to the submitter. Records are stored in the `fbi_records` database in the `witnessStatements`, `evidence`, and `confidentialInformants` collections. The evidence image bucket is `evidenceImages`. An evidence image must be sent within 15 minutes and be no larger than 8 MB.

## MongoDB setup

1. Rotate the MongoDB Atlas database-user password if its connection URI was ever shared in chat.
2. Save the replacement connection URI as the Replit Secret `MONGODB_URI`. Never commit or print it.
3. Allow the Replit bot's outbound connection in MongoDB Atlas Network Access. Use a narrow allowlist where possible.
4. Restart the `FBI Rules Bot` workflow. It logs a generic readiness message and does not print the URI.

MongoDB access is lazy when `MONGODB_URI` is missing, so the existing `/fbi-rules` panel can still run. Record submissions require a working secret and database connection.