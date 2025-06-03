/**
 * Модуль с моковыми данными для работы без сервера API
 * Используется как fallback, когда сервер недоступен
 */

// Заглушка для пользовательской сессии
export const mockSessionData = {
  userId: 'mock_user_123',
  session: {
    id: 'mock_session_456',
    playground: {
      type: 'basketball_court.glb',
      width: 40,
      length: 30,
      color: 'серый'
    },
    models: []
  }
};

// Заглушка для моделей
export const mockModels = [
  { id: 1, article: 'SW-001', quantity: 1 },
  { id: 2, article: 'SW-002', quantity: 1 },
  { id: 3, article: 'SW-003', quantity: 1 }
];
