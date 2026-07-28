with open('src/services/permissionService.ts', 'r') as f:
    lines = f.readlines()

new_functions = """
export function canWrite(profile: UserProfileLike | null | undefined): boolean {
  if (!auth.currentUser || !isActiveApproved(profile)) {
    return false;
  }
  return atLeast(effectiveRole(profile), 'Operator');
}

export function canCreate(profile: UserProfileLike | null | undefined): boolean {
  return canWrite(profile);
}

export function canEdit(profile: UserProfileLike | null | undefined): boolean {
  return canWrite(profile);
}

export function canDelete(profile: UserProfileLike | null | undefined): boolean {
  if (!auth.currentUser || !isActiveApproved(profile)) {
    return false;
  }
  return atLeast(effectiveRole(profile), 'Foreman'); // Foreman includes Supervisor, above Operator
}

export function canApprove(profile: UserProfileLike | null | undefined): boolean {
  if (!auth.currentUser || !isActiveApproved(profile)) {
    return false;
  }
  return atLeast(effectiveRole(profile), 'Environment Superintendent');
}
"""

# insert after line 50
lines.insert(50, new_functions + '\n')

with open('src/services/permissionService.ts', 'w') as f:
    f.writelines(lines)
