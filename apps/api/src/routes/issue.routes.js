import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  createIssueSchema,
  updateIssueSchema,
  moveIssueSchema,
  commentSchema,
} from '@gitjira/shared/issue-schemas';
import * as issues from '../controllers/issue.controller.js';
import * as searchCtl from '../controllers/search.controller.js';
import * as comments from '../controllers/comment.controller.js';
import * as attachments from '../controllers/attachment.controller.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// mergeParams so :key from the parent project router is visible here.
export const issueRoutes = Router({ mergeParams: true });

issueRoutes.get('/', asyncHandler(issues.list));
issueRoutes.get('/search', asyncHandler(searchCtl.search));
issueRoutes.post('/', validate(createIssueSchema), asyncHandler(issues.create));
issueRoutes.get('/:number', asyncHandler(issues.getOne));
issueRoutes.get('/:number/detail', asyncHandler(issues.detail));
issueRoutes.patch('/:number', validate(updateIssueSchema), asyncHandler(issues.update));
issueRoutes.patch('/:number/move', validate(moveIssueSchema), asyncHandler(issues.move));
issueRoutes.delete('/:number', asyncHandler(issues.remove));

// comments
issueRoutes.post('/:number/comments', validate(commentSchema), asyncHandler(comments.create));
issueRoutes.patch(
  '/:number/comments/:commentId',
  validate(commentSchema),
  asyncHandler(comments.update)
);
issueRoutes.delete('/:number/comments/:commentId', asyncHandler(comments.remove));

// attachments (upload nested under an issue; download is top-level, see routes/index)
issueRoutes.post('/:number/attachments', upload.single('file'), asyncHandler(attachments.upload));
