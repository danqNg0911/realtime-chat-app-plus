import User from "../models/UserModel.js";

export const YOU_BLOCKED_THEM_MESSAGE =
  "You have blocked this user. You cannot invite them to a group.";

export const THEY_BLOCKED_YOU_MESSAGE =
  "You have been blocked by this user. You cannot invite them to a group.";

const toIdString = (value) => value?.toString();

const buildBlockedMap = (users = []) => {
  const map = new Map();
  users.forEach((user) => {
    const key = toIdString(user._id);
    map.set(
      key,
      new Set((user.blockedUsers || []).map((entry) => entry.toString()))
    );
  });
  return map;
};

const hasBlockingConflict = (blockedMap, firstId, secondId) => {
  if (!firstId || !secondId) {
    return { blocked: false };
  }

  const firstBlocked = blockedMap.get(firstId);
  const secondBlocked = blockedMap.get(secondId);

  const firstBlockedSecond = firstBlocked && firstBlocked.has(secondId);
  const secondBlockedFirst = secondBlocked && secondBlocked.has(firstId);

  if (firstBlockedSecond) {
    return { blocked: true, blocker: firstId, blocked: secondId };
  }

  if (secondBlockedFirst) {
    return { blocked: true, blocker: secondId, blocked: firstId };
  }

  return { blocked: false };
};

export const detectBlockingConflictForMembers = async (
  memberIds = [],
  requesterId
) => {
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return { conflict: false };
  }

  const uniqueIds = [...new Set(memberIds.map((id) => id.toString()))];
  const users = await User.find({ _id: { $in: uniqueIds } }).select(
    "blockedUsers"
  );

  const blockedMap = buildBlockedMap(users);
  const requesterIdStr = toIdString(requesterId);

  for (let i = 0; i < uniqueIds.length; i += 1) {
    for (let j = i + 1; j < uniqueIds.length; j += 1) {
      const firstId = uniqueIds[i];
      const secondId = uniqueIds[j];

      const blockResult = hasBlockingConflict(blockedMap, firstId, secondId);

      if (blockResult.blocked) {
        let message;
        if (blockResult.blocker === requesterIdStr) {
          message = YOU_BLOCKED_THEM_MESSAGE;
        } else if (blockResult.blocked === requesterIdStr) {
          message = THEY_BLOCKED_YOU_MESSAGE;
        } else {
          message =
            "These users have blocked each other and cannot be in the same group.";
        }

        return {
          conflict: true,
          pair: [firstId, secondId],
          blocker: blockResult.blocker,
          blockedUser: blockResult.blocked,
          message,
        };
      }
    }
  }

  return { conflict: false };
};

export const detectBlockingConflictBetweenSets = async (
  existingMemberIds = [],
  candidateMemberIds = [],
  requesterId
) => {
  if (!Array.isArray(candidateMemberIds) || candidateMemberIds.length === 0) {
    return { conflict: false };
  }

  const uniqueExistingIds = [
    ...new Set(existingMemberIds.map((id) => id.toString())),
  ];
  const uniqueCandidateIds = [
    ...new Set(candidateMemberIds.map((id) => id.toString())),
  ];

  const combinedIds = [...new Set([...uniqueExistingIds, ...uniqueCandidateIds])];
  const users = await User.find({ _id: { $in: combinedIds } }).select(
    "blockedUsers"
  );

  const blockedMap = buildBlockedMap(users);
  const requesterIdStr = toIdString(requesterId);

  for (const candidateId of uniqueCandidateIds) {
    for (const existingId of uniqueExistingIds) {
      if (candidateId === existingId) {
        continue;
      }

      const blockResult = hasBlockingConflict(
        blockedMap,
        candidateId,
        existingId
      );

      if (blockResult.blocked) {
        let message;
        if (blockResult.blocker === requesterIdStr) {
          message = YOU_BLOCKED_THEM_MESSAGE;
        } else if (blockResult.blocked === requesterIdStr) {
          message = THEY_BLOCKED_YOU_MESSAGE;
        } else {
          message =
            "This user has a blocking conflict with an existing group member.";
        }

        return {
          conflict: true,
          pair: [existingId, candidateId],
          blocker: blockResult.blocker,
          blockedUser: blockResult.blocked,
          message,
        };
      }
    }
  }

  return { conflict: false };
};
