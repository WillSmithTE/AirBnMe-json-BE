var schema = {
    "type": "object",
    "properties": {
      "users": {
        "type": "array",
        "minItems": 3,
        "maxItems": 5,
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "number",
              "unique": true,
              "minimum": 1
            },
            "name": {
              "type": "string",
              "faker": "name"
            },
            "email": {
              "type": "string",
              "faker": "internet.email"
            },
            "password": {
                "type": "string",
                "faker": "password"
            },
            "isAdmin": {
                "type": "boolean"
            }
          },
          "required": ["id", "type", "name", "email","isAdmin","password"]
        }
      }
    },
    "required": ["users"]
  };
  
  module.exports = schema;