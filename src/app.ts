import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
let userRoutes, authRoutes, testRoutes, errorHandler;
try {
  userRoutes = require('./routes/user.routes').default;
  authRoutes = require('./routes/auth.routes').default;
  testRoutes = require('./routes/test.routes').default;
  errorHandler = require('./middlewares/errorHandler').default;
} catch (error) {
  console.error('Error importing modules:', error);
  process.exit(1);
}

const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(helmet());
app.use(compression());
app.use('/api/test', testRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

export default app;
