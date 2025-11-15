import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupsInCommon,
  getGroupMembers,
  getGroupMessages,
  searchGroups,
  addMemberToGroup,
  updateGroupInfo,
  leaveGroup,
  getGroupFiles,
} from "../controllers/GroupControllers.js";

const groupRoutes = Router();

groupRoutes.post("/create-group", verifyToken, createGroup);
groupRoutes.get("/get-user-groups", verifyToken, getUserGroups);
groupRoutes.get(
  "/get-groups-in-common/:contactId",
  verifyToken,
  getGroupsInCommon
);
groupRoutes.get("/get-group-members/:groupId", verifyToken, getGroupMembers);
groupRoutes.get("/get-group-messages/:groupId", verifyToken, getGroupMessages);
groupRoutes.post("/search-groups", verifyToken, searchGroups);
groupRoutes.post("/add-member/:groupId", verifyToken, addMemberToGroup);
groupRoutes.put("/update-group-info/:groupId", verifyToken, updateGroupInfo);
groupRoutes.delete("/leave-group/:groupId", verifyToken, leaveGroup);
groupRoutes.get("/get-group-files/:groupId", verifyToken, getGroupFiles);

export default groupRoutes;
