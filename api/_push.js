// Notifications to phones that installed felt and said yes. A failed notification never breaks a move.

export async function pushTo(db, uid, payload, { onlyIfAway = false } = {}) {
  try {
    const subs = await db.pushSubs(uid);
    const cutoff = Date.now() - 30000;
    for (const s of subs || []) {
      if (onlyIfAway && s.active_at && Date.parse(s.active_at) > cutoff) continue; // they're looking at the table already
      const r = await db.sendPush(s.sub, payload);
      if (r === "gone") await db.dropPushSub(s.endpoint);
    }
  } catch (e) { /* notifications are best effort */ }
}
