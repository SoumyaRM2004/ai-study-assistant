export const mockAuth = {
  register: async (data: { name: string; email: string; password: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockUser = {
      id: 'mock-user-uuid',
      name: data.name,
      email: data.email,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      user: mockUser,
    };
  },

  login: async (data: { email: string; password: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockUser = {
      id: 'mock-user-uuid',
      name: data.email.split('@')[0],
      email: data.email,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      user: mockUser,
    };
  },

  refresh: async (refreshToken: string) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      access_token: 'mock-new-access-token',
      refresh_token: 'mock-new-refresh-token',
      token_type: 'bearer',
    };
  },

  me: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const cachedUser = localStorage.getItem('mock_user');
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }
    return {
      id: 'mock-user-uuid',
      name: 'Jane Doe',
      email: 'jane@example.com',
      created_at: new Date().toISOString(),
    };
  },
};
