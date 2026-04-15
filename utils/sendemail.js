const { sendEmail } = require('../services/fees/v1/mailerService');

const sendmail = async ({ to, subject, html, text }) => {
	return sendEmail({ to, subject, html, text });
};

module.exports = {
	sendmail
};