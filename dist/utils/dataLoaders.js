"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDataLoaders = void 0;
const dataloader_1 = __importDefault(require("dataloader"));
const User_1 = require("../entities/User");
const Upvote_1 = require("../entities/Upvote");
const batchGetUsers = async (userIds) => {
    const users = await User_1.User.findByIds(userIds);
    return userIds.map((userId) => users.find((user) => user.id === userId));
};
const batchGetVoteTypes = async (voteTypeConditions) => {
    const voteTypes = await Upvote_1.Upvote.findByIds(voteTypeConditions);
    return voteTypeConditions.map((voteTypeCondition) => voteTypes.find((voteType) => voteType.postId === voteTypeCondition.postId && voteType.userId === voteTypeCondition.userId));
};
const buildDataLoaders = () => ({
    userLoader: new dataloader_1.default((userIds) => batchGetUsers(userIds)),
    voteTypeLoader: new dataloader_1.default((voteTypeConditions) => batchGetVoteTypes(voteTypeConditions)),
});
exports.buildDataLoaders = buildDataLoaders;
//# sourceMappingURL=dataLoaders.js.map