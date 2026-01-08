import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";

export class ForumCommentUpvote {
  app: Application;

  constructor(options: any, app: Application) {
    this.app = app;
  }

  async create(data: any, params?: Params): Promise<any> {
    const { commentId, voteType } = data;
    const userId = params?.user?._id;

    if (!commentId || !userId) {
      throw new BadRequest("commentId and userId are required");
    }

    if (voteType && !["upvote", "downvote", "remove"].includes(voteType)) {
      throw new BadRequest("voteType must be 'upvote', 'downvote', or 'remove'");
    }

    const mongoose = this.app.get("mongooseClient");
    const forumPostCommentsModel = mongoose.models.forumPostComments;
    const forumCommentVotesModel = mongoose.models.forumCommentVotes;

    // Skip transactions in test environment (standalone MongoDB doesn't support them)
    const useTransactions = process.env.NODE_ENV !== "test";
    const session = useTransactions ? await mongoose.startSession() : null;
    
    if (session) {
      session.startTransaction();
    }

    try {
      // Check if comment exists
      const comment = session
        ? await forumPostCommentsModel.findById(commentId).session(session)
        : await forumPostCommentsModel.findById(commentId);
      if (!comment || comment.isDeleted) {
        throw new BadRequest("Comment not found or deleted");
      }

      // Find existing vote
      const existingVote = session
        ? await forumCommentVotesModel.findOne({ commentId, userId }).session(session)
        : await forumCommentVotesModel.findOne({ commentId, userId });

      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (voteType === "remove") {
        // Remove vote
        if (existingVote) {
          if (session) {
            await forumCommentVotesModel.deleteOne({ _id: existingVote._id }).session(session);
          } else {
            await forumCommentVotesModel.deleteOne({ _id: existingVote._id });
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
              await forumCommentVotesModel.deleteOne({ _id: existingVote._id }).session(session);
            } else {
              await forumCommentVotesModel.deleteOne({ _id: existingVote._id });
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
            await forumCommentVotesModel.create([{
              commentId,
              userId,
              voteType,
            }], { session });
          } else {
            await forumCommentVotesModel.create({
              commentId,
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

      // Update comment counters
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
        const newUpvotes = comment.upvotes + upvoteDelta;
        const newDownvotes = comment.downvotes + downvoteDelta;
        const newVoteScore = newUpvotes - newDownvotes;
        update.voteScore = newVoteScore;
        
        if (session) {
          await forumPostCommentsModel.findByIdAndUpdate(commentId, update, { session });
        } else {
          await forumPostCommentsModel.findByIdAndUpdate(commentId, update);
        }
      }

      // Commit transaction
      if (session) {
        await session.commitTransaction();
      }

      // Get updated comment
      const updatedComment = await forumPostCommentsModel.findById(commentId).lean();
      
      return {
        success: true,
        comment: {
          _id: updatedComment._id,
          upvotes: updatedComment.upvotes,
          downvotes: updatedComment.downvotes,
          voteScore: updatedComment.voteScore,
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
