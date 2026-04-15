const ok = (res, data = null, meta = null, statusCode = 200) => {
	return res.status(statusCode).json({
		success: true,
		data,
		error: null,
		meta
	});
};

const fail = (res, { statusCode = 400, code = 'bad_request', message = 'Bad request', details = null } = {}) => {
	return res.status(statusCode).json({
		success: false,
		data: null,
		error: {
			code,
			message,
			details
		},
		meta: null
	});
};

module.exports = {
	ok,
	fail
};