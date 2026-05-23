import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // CREATE GROUP
  if (action === 'create') {
    const { name, description, target_amount, end_date, icon } = body;
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const today = new Date().toISOString().split('T')[0];

    const group = await base44.entities.SavingsGroup.create({
      name, description, target_amount, icon: icon || '🏦',
      created_by: user.id, status: 'active',
      invite_code, members_count: 1,
      current_amount_saved: 0, start_date: today,
      end_date: end_date || null,
    });

    await base44.entities.GroupMember.create({
      group_id: group.id, user_id: user.id,
      user_email: user.email, user_name: user.full_name,
      role: 'admin', status: 'active',
      total_contributed: 0, joined_at: new Date().toISOString(),
    });

    return Response.json({ group, invite_code });
  }

  // JOIN GROUP by invite code
  if (action === 'join') {
    const { invite_code } = body;
    const groups = await base44.entities.SavingsGroup.filter({});
    const group = groups.find(g => g.invite_code === invite_code && g.status === 'active');
    if (!group) return Response.json({ error: 'Invalid or expired invite code' }, { status: 404 });

    const members = await base44.entities.GroupMember.filter({ group_id: group.id });
    const alreadyMember = members.find(m => m.user_id === user.id && m.status !== 'left');
    if (alreadyMember) return Response.json({ error: 'Already a member', group });

    await base44.entities.GroupMember.create({
      group_id: group.id, user_id: user.id,
      user_email: user.email, user_name: user.full_name,
      role: 'member', status: 'active',
      total_contributed: 0, joined_at: new Date().toISOString(),
    });

    await base44.entities.SavingsGroup.update(group.id, {
      members_count: (group.members_count || 1) + 1,
    });

    // Notify group admin
    await base44.asServiceRole.entities.Notification.create({
      user_id: group.created_by,
      title: `👥 New member joined "${group.name}"`,
      body: `${user.full_name} joined your savings group.`,
      type: 'system', priority: 'low', is_read: false,
    });

    return Response.json({ group, joined: true });
  }

  // CONTRIBUTE to group
  if (action === 'contribute') {
    const { group_id, amount, notes } = body;
    const groups = await base44.entities.SavingsGroup.filter({ id: group_id });
    const group = groups[0];
    if (!group) return Response.json({ error: 'Group not found' }, { status: 404 });

    const contribution = await base44.entities.GroupContribution.create({
      group_id, user_id: user.id, user_name: user.full_name,
      amount: parseFloat(amount), notes: notes || '',
      contributed_at: new Date().toISOString(),
    });

    const newTotal = (group.current_amount_saved || 0) + parseFloat(amount);
    await base44.entities.SavingsGroup.update(group_id, {
      current_amount_saved: newTotal,
    });

    // Update member's total_contributed
    const members = await base44.entities.GroupMember.filter({ group_id, user_id: user.id });
    if (members[0]) {
      await base44.entities.GroupMember.update(members[0].id, {
        total_contributed: (members[0].total_contributed || 0) + parseFloat(amount),
      });
    }

    // Check if goal reached
    if (newTotal >= group.target_amount) {
      await base44.entities.SavingsGroup.update(group_id, { status: 'completed' });
      const allMembers = await base44.entities.GroupMember.filter({ group_id });
      for (const member of allMembers.filter(m => m.status === 'active')) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: member.user_id,
          title: `🎉 Group Goal Reached! "${group.name}"`,
          body: `Your savings group reached the target of UGX ${group.target_amount.toLocaleString()}!`,
          type: 'savings_goal', priority: 'high', is_read: false,
          action_url: '/savings-groups',
        });
      }
    }

    return Response.json({ contribution, new_total: newTotal });
  }

  // LEAVE group
  if (action === 'leave') {
    const { group_id } = body;
    const members = await base44.entities.GroupMember.filter({ group_id, user_id: user.id });
    if (members[0]) {
      await base44.entities.GroupMember.update(members[0].id, { status: 'left' });
      const groupArr = await base44.entities.SavingsGroup.filter({ id: group_id });
      const group = groupArr[0];
      if (group) {
        await base44.entities.SavingsGroup.update(group_id, {
          members_count: Math.max(0, (group.members_count || 1) - 1),
        });
      }
    }
    return Response.json({ left: true });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});