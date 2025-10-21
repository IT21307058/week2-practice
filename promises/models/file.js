const { mongoose } = require("../db/db");

const FileSchema = new mongoose.Schema({
    filename: String,
    contentType: String,
    data: Buffer,
    uploadDate: { type: Date, default: Date.now }
});

const File = mongoose.model('File', FileSchema);
module.exports = File;