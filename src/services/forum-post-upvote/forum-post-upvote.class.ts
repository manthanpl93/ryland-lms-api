import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";

export class ForumPostUpvote {
  app: Application;

  constructor(options: any, app: Application) {
    this.app = app;
  }

  async create(data: any, params?: Params): Promise<any> {
    const { postId, voteType } = data;
    const userId = params?.user?._id;

    if (!postId || !userId) {
      throw new BadRequest("postId and userId are required");
    }

    if (voteType && !["upvote", "downvote", "remove"].includes(voteType)) {
      throw new BadRequest("voteType must be 'upvote', 'downvote', or 'remove'");
    }

    const mongoose = this.app.get("mongooseClient");
    const forumPostsModel = mongoose.models.forumPosts;
    const forumPostVotesModel = mongoose.models.forumPostVotes;

    // Skip transactions in test environment (standalone MongoDB doesn't support them)
    const useTransactions = process.env.NODE_ENV !== "test";
    const session = useTransactions ? await mongoose.startSession() : null;
    
    if (session) {
      session.startTransaction();
    }

    try {
      // Check if post exists
      const post = session 
        ? await forumPostsModel.findById(postId).session(session)
        : await forumPostsModel.findById(postId);
      if (!post || post.isDeleted) {
        throw new BadRequest("Post not found or deleted");
      }

      // Find existing vote
      const existingVote = session
        ? await forumPostVotesModel.findOne({ postId, userId }).session(session)
        : await forumPostVotesModel.findOne({ postId, userId });

      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (voteType === "remove") {
        // Remove vote
        if (existingVote) {
          if (session) {
            await forumPostVotesModel.deleteOne({ _id: existingVote._id }).session(session);
          } else {
            await forumPostVotesModel.deleteOne({ _id: existingVote._id });
          }
          
          if (existingVote.voteType === "upvote") {
            upvoteDelta = -1;
          } else {
            downvoteDelta = -1;
          }
        }
      } else {
        // Add or update vote
        if (existingVote) {
          // Toggle or change vote
          if (existingVote.voteType === voteType) {
            // Same vote type - toggle off (remove)
            if (session) {
              await forumPostVotesModel.deleteOne({ _id: existingVote._id }).session(session);
            } else {
              await forumPostVotesModel.deleteOne({ _id: existingVote._id });
            }
            
            if (voteType === "upvote") {
              upvoteDelta = -1;
            } else {
              downvoteDelta = -1;
            }
          } else {
            // Different vote type - change vote
            existingVote.voteType = voteType;
            if (session) {
              await existingVote.save({ session });
            } else {
              await existingVote.save();
            }
            
            if (voteType === "upvote") {
              upvoteDelta = 1;
              downvoteDelta = -1;
            } else {
              upvoteDelta = -1;
              downvoteDelta = 1;
            }
          }
        } else {
          // New vote
          if (session) {
            await forumPostVotesModel.create([{
              postId,
              userId,
              voteType,
            }], { session });
          } else {
            await forumPostVotesModel.create({
              postId,
              userId,
              voteType,
            });
          }
          
          if (voteType === "upvote") {
            upvoteDelta = 1;
          } else {
            downvoteDelta = 1;
          }
        }
      }

      // Update post counters
      if (upvoteDelta !== 0 || downvoteDelta !== 0) {
        const update: any = {};
        if (upvoteDelta !== 0) {
          update.$inc = update.$inc || {};
          update.$inc.upvotes = upvoteDelta;
        }
        if (downvoteDelta !== 0) {
          update.$inc = update.$inc || {};
          update.$inc.downvotes = downvoteDelta;
        }
        
        // Calculate new voteScore
        const newUpvotes = post.upvotes + upvoteDelta;
        const newDownvotes = post.downvotes + downvoteDelta;
        const newVoteScore = newUpvotes - newDownvotes;
        update.voteScore = newVoteScore;
        
        if (session) {
          await forumPostsModel.findByIdAndUpdate(postId, update, { session });
        } else {
          await forumPostsModel.findByIdAndUpdate(postId, update);
        }
      }

      // Commit transaction
      if (session) {
        await session.commitTransaction();
      }

      // Get updated post
      const updatedPost = await forumPostsModel.findById(postId).lean();
      
      return {
        success: true,
        post: {
          _id: updatedPost._id,
          upvotes: updatedPost.upvotes,
          downvotes: updatedPost.downvotes,
          voteScore: updatedPost.voteScore,
        },
        userVote: voteType === "remove" ? null : (existingVote && existingVote.voteType === voteType ? null : voteType),
      };
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
}

