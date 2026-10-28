import { useAuthStore } from '@/store/authStore';
import { isAdminRole } from '@/utils/userRole';
export const useIsAdmin = () => useAuthStore((state) => isAdminRole(state.user));
