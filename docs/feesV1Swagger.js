module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'ERP Fees V1 API',
    version: '1.0.0',
    description: 'Role-wise fees API documentation'
  },
  servers: [
    {
      url: '/',
      description: 'Current server'
    }
  ],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};
