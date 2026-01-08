import { Application } from "./declarations";
import communitiesModel from "./models/communities.model";
import forumTagsModel from "./models/forum-tags.model";
import forumPostsModel from "./models/forum-posts.model";
import forumPostVotesModel from "./models/forum-post-votes.model";
import forumPostCommentsModel from "./models/forum-post-comments.model";
import forumCommentVotesModel from "./models/forum-comment-votes.model";
import savedPostsModel from "./models/saved-posts.model";

/**
 * Initialize models that don't have dedicated services
 * These models are used by other services but need to be registered early
 */
export default function (app: Application): void {
  // Initialize all forum-related models
  communitiesModel(app);
  forumTagsModel(app);
  forumPostsModel(app);
  forumPostVotesModel(app);
  forumPostCommentsModel(app);
  forumCommentVotesModel(app);
  savedPostsModel(app);
}
