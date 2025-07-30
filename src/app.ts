import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import testRoutes from './routes/test.routes';
import errorHandler from './middlewares/errorHandler';

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