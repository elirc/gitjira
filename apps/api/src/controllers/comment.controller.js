import { addComment, editComment, deleteComment } from '../services/comment.service.js';

export async function create(req, res) {
  const comment = await addComment(
    req.params.key,
    Number(req.params.number),
    req.user.id,
    req.body.body
  );
  res.status(201).json({ comment });
}

export async function update(req, res) {
  const comment = await editComment(
    req.params.key,
    Number(req.params.number),
    req.user.id,
    req.params.commentId,
    req.body.body
  );
  res.json({ comment });
}

export async function remove(req, res) {
  await deleteComment(req.params.key, Number(req.params.number), req.user.id, req.params.commentId);
  res.status(204).end();
}
