export const isProfileComplete = (profile: any): boolean => {
  return !!(
    profile?.name &&
    profile?.rank &&
    profile?.contact &&
    profile?.station &&
    profile?.badgeNumber &&
    profile?.unitType &&
    profile?.shift
  );
}; 