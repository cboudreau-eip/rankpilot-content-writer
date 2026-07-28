const bcrypt = require('bcryptjs');
bcrypt.hash('TestPass123!', 12).then(h => console.log(h));
