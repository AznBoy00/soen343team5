// DB Connection
// once the UOW is implemented the DB connection should no longer reside in here
const pool = require('../db');

// getCatalog Module
module.exports.getCatalog = async function(){
    const client = await pool.connect();
    const resultBook = await client.query('SELECT * FROM books ORDER BY item_id ASC');
    const resultMagazine = await client.query('SELECT * FROM magazines ORDER BY item_id ASC');
    const resultMovie = await client.query('SELECT * FROM movies ORDER BY item_id ASC');
    const resultMusic = await client.query('SELECT * FROM music ORDER BY item_id ASC');
    client.release();

    let result = [];
    result.items = (resultBook != null) ? resultBook.rows : null;
    (resultMagazine != null) ? result.items = result.items.concat(resultMagazine.rows) : null;
    (resultMovie != null) ? result.items = result.items.concat(resultMovie.rows) : null;
    (resultMusic != null) ? result.items = result.items.concat(resultMusic.rows) : null;

    result.items.sort(function (a, b) {
        return a.item_id - b.item_id;
    });

    return result;
};

//filter Module
module.exports.getFilteredCatalog = async function(type){
    const client = await pool.connect();
    // console.log(getFilterType(type));
    const resultBook = await client.query('SELECT * FROM (SELECT item_id, discriminator, title, author, release_date, quantity, loanable FROM books ' +
        'UNION SELECT item_id, discriminator, title, publisher, release_date, quantity, loanable FROM magazines ' +
        'UNION SELECT item_id, discriminator, title, director, release_date, quantity, loanable FROM movies ' +
        'UNION SELECT item_id, discriminator, title, artist, release_date, quantity, loanable FROM music )'+ getFilterType(type));
    client.release();
    // console.log( await resultBook);

    let result = [];
    result.items = (resultBook != null) ? resultBook.rows : [];

    return result;
}

module.exports.getSearchResults = async function(search) {
    const client = await pool.connect();
    const resultBook = await client.query('SELECT * FROM books WHERE Lower(title) LIKE \'%' + search + '%\' OR LOWER(author) LIKE \'%'+ search +'%\' ORDER BY item_id ASC');
    const resultMagazine = await client.query("SELECT * FROM magazines WHERE Lower(title) LIKE '%" + search + "%' ORDER BY item_id ASC");
    const resultMovie = await client.query("SELECT * FROM movies WHERE Lower(title) LIKE '%" + search + "%' OR LOWER(director) LIKE '%"+search+"%' OR LOWER(producers) LIKE '%"+search+"%' ORDER BY item_id ASC");
    const resultMusic = await client.query("SELECT * FROM music WHERE Lower(title) LIKE '%" + search + "%' OR LOWER(artist) LIKE '%"+search+"%' OR LOWER(label) LIKE '%"+search+"%' ORDER BY item_id ASC");
    client.release();
    let result = [];
    result.items = (resultBook != null) ? resultBook.rows : null;
    (resultMagazine != null) ? result.items = result.items.concat(resultMagazine.rows) : null;
    (resultMovie != null) ? result.items = result.items.concat(resultMovie.rows) : null;
    (resultMusic != null) ? result.items = result.items.concat(resultMusic.rows) : null;

    return await result;
}


// insertNewItem Module
module.exports.insertNewItem = async function(newItem, discriminator){

    // build the query string in the format:
    // insert into the Item table first, in order to get the item_id later
    let itemQuery = "INSERT INTO Items (discriminator) VALUES (\'"+discriminator+"\');";
    let query = "INSERT INTO " + discriminator + " (item_id, ";
    // iterate over attribute names
    for(var i in newItem){
        if(newItem[i] != null){
            query = query + i + ", ";
        }
    }
    //remove the last comma
    query = query.slice(0, -2);
    query = query + ") SELECT select_id, "
    // iterate over attribute values
    for(var j in newItem){
        if(newItem[j] != null){
            query = query +"\'"+ newItem[j] + "\', ";
        }
    }
    //remove the last comma
    query = query.slice(0, -2);
    query = query + " FROM (SELECT CURRVAL('items_item_id_seq') select_id)q;"
    
    let result = [];
      
    result.itemQuery = itemQuery;
    result.discriminatorQuery = query;
    return result;
}

//get all Ids
module.exports.getAllIds = async function() {
    let query = "SELECT item_id FROM Items";
    const client = await pool.connect();
    const result = await client.query(query);
    client.release();
    return result.rows;
}

// get the most recent item insterted into the item table
// this query makes use of the auto generated postgresql items_item_id_seq table
module.exports.getMostRecentItemId = async function(){
    //accessed as varaibleName.rows[0].item_id
    return "SELECT currval('items_item_id_seq') AS item_id;";
}

// getItemByID Module
module.exports.getItemByID = async function(item_id){

    let query = "SELECT items.discriminator FROM items WHERE items.item_id = " + item_id;
    
    const client = await pool.connect();
    const res1 = await client.query(query);
    //console.log(await res1.rows);
    const result1 = (res1 != null) ? res1.rows : null;

    let discriminator = await result1[0].discriminator;

    let query2 = "SELECT * FROM " + discriminator + " WHERE item_id = " + item_id + ";";
    let result = await client.query(query2);

    client.release();
    const results = { 'results': (result) ? result.rows : null};
    return await results;
}

//updateItem Module
module.exports.updateItem = async function(newItem, item_id, discriminator){

    // build the query string
    let query = "UPDATE " + discriminator + " SET ";
    for(var i in newItem){
        if(newItem[i] != null){
            // set attribute name = attribute value
            query = query + i + " = \'" + newItem[i] + "\', ";
        }
    }
    query = query.slice(0, -2); //remove the last comma
    query = query + " WHERE item_id = " + item_id + ";";
    return query;
}

//delete Module
module.exports.deleteItem = async function(item_id){
    let query = "DELETE FROM Items WHERE item_id = " + item_id + ";"
    return query;
}

module.exports.getAllTransactions = async function(){
    const client = await pool.connect();
    const resultTransaction = await client.query('SELECT * FROM transactions ORDER BY transaction_id ASC');
    client.release();

    let result = [];
    result.items = (resultTransaction != null) ? resultTransaction.rows : null;
    return result;
}

let getFilterType = function (type) {
    if(type === '1')
        return 'AS U ORDER BY title ASC';
    else if(type === '2')
        return 'AS U ORDER BY title DESC';
    else if(type === '3')
        return 'AS U ORDER BY release_date DESC';
    else if(type === '4')
        return 'AS U ORDER BY release_date ASC';
    else if(type === '5')
        return "AS U WHERE loanable = 't' ORDER BY item_id ASC";
}