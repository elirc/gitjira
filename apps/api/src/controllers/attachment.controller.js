import { addAttachment, getAttachmentForDownload } from '../services/attachment.service.js';
import fs from 'node:fs';

export async function upload(req, res) {
  const attachment = await addAttachment(
    req.params.key,
    Number(req.params.number),
    req.user.id,
    req.file
  );
  res.status(201).json({ attachment });
}

export async function download(req, res) {
  const { attachment, filePath } = await getAttachmentForDownload(req.params.id, req.user.id);
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
  fs.createReadStream(filePath).pipe(res);
}
