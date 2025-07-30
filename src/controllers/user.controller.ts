import { Request, Response } from 'express';

export const getUsers = (req: Request, res: Response) => {
  console.log('Fetching users');
  res.json([{ name: 'Alice1' }, { name: 'Bob' }]);
};
