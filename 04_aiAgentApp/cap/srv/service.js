const cds = require('@sap/cds');
const { UPDATE } = cds.ql;

let array2VectorBuffer = (data) => {
    const sizeFloat = 4;
    const sizeDimensions = 4;
    const bufferSize = data.length * sizeFloat + sizeDimensions;

    const buffer = Buffer.allocUnsafe(bufferSize);
    // write size into buffer
    buffer.writeUInt32LE(data.length, 0);
    data.forEach((value, index) => {
        buffer.writeFloatLE(value, index * sizeFloat + sizeDimensions);
    });
    return buffer;
};

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));
const timeout_milisec = 5000;

module.exports = function () {

    const { Qahistory } = cds.entities;

    this.after(['CREATE', 'UPDATE'], 'Qahistory', async (qa) => {
        await embedQuestion(qa);
    });

    const embedQuestion = async function (qa) {
        console.log(`================ Embedding Question: ${qa.ID} ================ `);
        const vectorplugin = await cds.connect.to("cap-llm-plugin");
        try {
            const mergedQa = `
                Q. ${qa.question}
                A. ${qa.answer}
            `
            // $batchで流し込むとembedding APIのコールが早すぎてエラーになるので待機
            console.log("WILL EMBED!");
            await timeout(timeout_milisec);
            const embedding = await vectorplugin.getEmbedding(mergedQa);
            console.log("EMBEDDED!");
            console.log(embedding);
            console.log("I'm about to run tx.run");
            const updatedData = {
                "mergedqa": mergedQa,
                "custom_embedding": array2VectorBuffer(embedding)
            };
            console.log(updatedData);
            const embeddingBuffer = array2VectorBuffer(embedding);
            await cds.run(`
                UPDATE "GPTSERVICE_QAHISTORY"
                SET "MERGEDQA" = ?, "CUSTOM_EMBEDDING" = ?
                WHERE "ID" = ?
              `, [mergedQa, embeddingBuffer, qa.ID]);
        } catch (error) {
            throw error;
        }
    }
}