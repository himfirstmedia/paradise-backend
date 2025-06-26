import bcrypt from "bcrypt";
export const encriptPassword = (password: string) => {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
};
export const isPasswordValid = (
  plainPassword: string,
  hashedPassword: string
) => {
  return bcrypt.compareSync(plainPassword, hashedPassword);
};
