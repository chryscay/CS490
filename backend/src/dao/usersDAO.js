let users;

export default class UsersDAO {
  static async injectDB(conn) {
    if (users) {
      return;
    }
    try {
      users = await conn.db("ats").collection("users");
    } catch (e) {
      console.error(`Unable to connect in usersDAO: ${e}`);
    }
  }

  static async addUser(user) {
    try {
      const result = await users.insertOne({
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        createdAt: new Date(),
      });

      return result;
    } catch (error) {
      console.error("addUser error:", error);
    }
  }

  static async findByFirebaseUid(uid) {
    try {
      const result = await users.findOne({
        firebaseUid: uid,
      });

      return result;
    } catch (error) {
      console.error("findByFirebaseUid error:", error);
    }
  }
}
