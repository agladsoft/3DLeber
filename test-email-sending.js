import nodemailer from 'nodemailer';

// Настройки email (встроенные в файл)
const EMAIL_CONFIG = {
    // SMTP настройки Mail.ru
    smtp: {
        host: 'smtp.mail.ru',
        port: 465,
        secure: true
    },
    // Учетные данные отправителя
    auth: {
        user: 'grafana_test_ruscon@mail.ru',
        pass: 'BCaWNbWNLdDoSwn6p5lL'
    },
    // Получатель
    recipient: 'uventus_work@mail.ru'
};

async function testEmailSending() {
    console.log('=== ТЕСТ ОТПРАВКИ EMAIL ===');
    console.log('Отправитель:', EMAIL_CONFIG.auth.user);
    console.log('Получатель:', EMAIL_CONFIG.recipient);
    console.log('SMTP сервер:', EMAIL_CONFIG.smtp.host + ':' + EMAIL_CONFIG.smtp.port);
    console.log();

    try {
        console.log('1. Создание транспорта...');
        const transporter = nodemailer.createTransport({
            host: EMAIL_CONFIG.smtp.host,
            port: EMAIL_CONFIG.smtp.port,
            secure: EMAIL_CONFIG.smtp.secure,
            auth: {
                user: EMAIL_CONFIG.auth.user,
                pass: EMAIL_CONFIG.auth.pass
            }
        });

        console.log('2. Проверка SMTP подключения...');
        await transporter.verify();
        console.log('✅ SMTP подключение успешно');

        console.log('3. Отправка тестового сообщения...');
        const mailOptions = {
            from: EMAIL_CONFIG.auth.user,
            to: EMAIL_CONFIG.recipient,
            subject: 'ТЕСТ - Проверка отправки email из Leber 3D',
            html: `
                <h2>🧪 Тестовое сообщение</h2>
                <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                <p><strong>Отправитель:</strong> ${EMAIL_CONFIG.auth.user}</p>
                <p><strong>Статус:</strong> Система отправки email работает корректно!</p>
                
                <h3>📋 Настройки подключения:</h3>
                <ul>
                    <li>SMTP сервер: ${EMAIL_CONFIG.smtp.host}</li>
                    <li>Порт: ${EMAIL_CONFIG.smtp.port}</li>
                    <li>Безопасное соединение: ${EMAIL_CONFIG.smtp.secure ? 'Да' : 'Нет'}</li>
                </ul>
                
                <hr>
                <p><small>Это тестовое сообщение из системы Leber 3D Constructor</small></p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ СООБЩЕНИЕ ОТПРАВЛЕНО УСПЕШНО!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('Получатель:', EMAIL_CONFIG.recipient);
        console.log();
        console.log('📧 Проверьте почту (включая папку Спам)');

    } catch (error) {
        console.error('❌ ОШИБКА ПРИ ОТПРАВКЕ:');
        console.error('Тип ошибки:', error.code || error.name);
        console.error('Сообщение:', error.message);
        
        if (error.code === 'EAUTH') {
            console.error();
            console.error('🔑 ПРОБЛЕМА С АУТЕНТИФИКАЦИЕЙ:');
            console.error('- Проверьте правильность логина и пароля');
            console.error('- Убедитесь, что логин и пароль от Mail.ru корректны');
            console.error('- Включите IMAP/SMTP в настройках Mail.ru (Почта → Настройки → IMAP/POP3/SMTP)');
            console.error('- Возможно нужно создать пароль для внешних приложений в Mail.ru');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error();
            console.error('🌐 ПРОБЛЕМА С ПОДКЛЮЧЕНИЕМ:');
            console.error('- Проверьте интернет соединение');
            console.error('- Возможно заблокирован доступ к Mail.ru SMTP');
            console.error('- Проверьте настройки файрвола');
        }
        
        console.error();
        console.error('📝 ТЕКУЩИЕ НАСТРОЙКИ:');
        console.error('Отправитель:', EMAIL_CONFIG.auth.user);
        console.error('SMTP сервер:', EMAIL_CONFIG.smtp.host);
        console.error('Порт:', EMAIL_CONFIG.smtp.port);
    }
}

// Запускаем тест
testEmailSending();