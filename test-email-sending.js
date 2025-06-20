import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

async function testEmailSending() {
    console.log('=== ТЕСТ ОТПРАВКИ EMAIL ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '***' : 'НЕ НАСТРОЕН');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***' : 'НЕ НАСТРОЕН');
    console.log();

    // Проверяем настройки
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ ОШИБКА: EMAIL_USER или EMAIL_PASS не настроены в .env файле');
        process.exit(1);
    }

    // Проверяем режим разработки
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
        console.log('⚠️  РЕЖИМ РАЗРАБОТКИ: Email не будет отправлен реально');
        console.log('Для реальной отправки установите NODE_ENV=production');
        return;
    }

    try {
        console.log('1. Создание транспорта...');
        const transporter = nodemailer.createTransport({
            host: 'smtp.mail.ru',
            port: 465,
            secure: true, // true для порта 465, false для других портов
            auth: {
                user: 'grafana_test_ruscon@mail.ru',
                pass: 'BCaWNbWNLdDoSwn6p5lL'
            }
        });

        console.log('2. Проверка SMTP подключения...');
        await transporter.verify();
        console.log('✅ SMTP подключение успешно');

        console.log('3. Отправка тестового сообщения...');
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'uventus_work@mail.ru',
            subject: 'ТЕСТ - Проверка отправки email из Leber 3D',
            html: `
                <h2>🧪 Тестовое сообщение</h2>
                <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                <p><strong>Отправитель:</strong> ${process.env.EMAIL_USER}</p>
                <p><strong>Статус:</strong> Система отправки email работает корректно!</p>
                
                <hr>
                <p><small>Это тестовое сообщение из системы Leber 3D Constructor</small></p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ СООБЩЕНИЕ ОТПРАВЛЕНО УСПЕШНО!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('Получатель: uventus_work@mail.ru');
        console.log();
        console.log('📧 Проверьте почту (включая папку Спам)');

    } catch (error) {
        console.error('❌ ОШИБКА ПРИ ОТПРАВКЕ:');
        console.error('Тип ошибки:', error.code || error.name);
        console.error('Сообщение:', error.message);
        
        if (error.code === 'EAUTH') {
            console.error();
            console.error('🔑 ПРОБЛЕМА С АУТЕНТИФИКАЦИЕЙ:');
            console.error('- Проверьте правильность EMAIL_USER и EMAIL_PASS');
            console.error('- Убедитесь, что логин и пароль от Mail.ru корректны');
            console.error('- Включите IMAP/SMTP в настройках Mail.ru (Почта → Настройки → IMAP/POP3/SMTP)');
            console.error('- Возможно нужно создать пароль для внешних приложений в Mail.ru');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error();
            console.error('🌐 ПРОБЛЕМА С ПОДКЛЮЧЕНИЕМ:');
            console.error('- Проверьте интернет соединение');
            console.error('- Возможно заблокирован доступ к Gmail SMTP');
        }
    }
}

// Запускаем тест
testEmailSending();