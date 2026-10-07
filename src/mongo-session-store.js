const session = require("express-session");

class MongoSessionStore extends session.Store {
  constructor({ readDb, writeDb, ttlMs }) {
    super();

    this.reader = readDb.collection("sessions");
    this.writer = writeDb.collection("sessions");
    this.ttlMs = ttlMs;
  }

  getExpiration(sessionData) {
    const expires = sessionData.cookie?.expires;

    return expires
      ? new Date(expires)
      : new Date(Date.now() + this.ttlMs);
  }

  // Đọc phiên bằng tài khoản chỉ đọc.
  get(sid, callback) {
    this.reader.findOne({
      _id: sid,
      expiresAt: { $gt: new Date() }
    }).then(
      (document) => {
        if (!document) {
          return callback(null, null);
        }

        let sessionData;

        try {
          sessionData = JSON.parse(document.data);
        } catch (error) {
          return callback(error);
        }

        callback(null, sessionData);
      },
      (error) => callback(error)
    );
  }

  // Tạo hoặc cập nhật phiên bằng tài khoản chỉ ghi.
  set(sid, sessionData, callback = () => {}) {
    let data;

    try {
      data = JSON.stringify(sessionData);
    } catch (error) {
      return callback(error);
    }

    this.writer.updateOne(
      { _id: sid },
      {
        $set: {
          data,
          expiresAt: this.getExpiration(sessionData)
        }
      },
      { upsert: true }
    ).then(
      () => callback(null),
      (error) => callback(error)
    );
  }

  // Xóa phiên bằng tài khoản chỉ ghi.
  destroy(sid, callback = () => {}) {
    this.writer.deleteOne({ _id: sid }).then(
      () => callback(null),
      (error) => callback(error)
    );
  }

  // Gia hạn phiên bằng tài khoản chỉ ghi.
  touch(sid, sessionData, callback = () => {}) {
    this.writer.updateOne(
      { _id: sid },
      {
        $set: {
          expiresAt: this.getExpiration(sessionData)
        }
      }
    ).then(
      () => callback(null),
      (error) => callback(error)
    );
  }
}

module.exports = MongoSessionStore;