let express = require('express');

let app = express();

let path = require('path');

const port = 3000;

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({extended: true}));

app.use('/public', express.static('public'));

//guys run npm install dotenv to get this to run
require("dotenv").config(); 
// then make a .env file that has
//DB_HOST=localhost
// DB_USER=postgres
// DB_PASSWORD=dfghjkl;'
// DB_NAME=assignment3
// DB_PORT=5432

require('dotenv').config();

const knex = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.RDS_HOSTNAME,
        user: process.env.RDS_USERNAME,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DB_NAME,
        port: process.env.RDS_PORT
    }
});

module.exports = knex;

const users = {
    user1: 'password1',
    user2: 'password2'
};

app.get('/', (req, res) => {
    const user = false;
    // Query the 'skills' table to get all the records
    knex('skills')
        .select('*') // Adjust this based on the schema of your 'skills' table
        .then(skills => {
            res.render('landingPage', { skills, user}); // Pass skills to the EJS template and optional user info
        })
        .catch(error => {
            console.error('Error fetching skills:', error);
            res.status(500).send('Internal Server Error');
        });
});

// Login route'
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'login'
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        // Query the 'skills' table to get all records after successful login
        knex('skills')
            .select('*')
            .then(skills => {
                res.render('landingPage', { skills, user: username }); // Pass 'skills' and 'user'
            })
            .catch(error => {
                console.error('Error fetching skills:', error);
                res.status(500).send('Internal Server Error');
            });
    } else {
        res.send('Invalid credentials');
    }
});


app.get('/landingPage', (req, res) => {
    const user = false;
    // Query the 'skills' table to get all the records
    knex('skills')
        .select('*') // Adjust this based on the schema of your 'skills' table
        .then(skills => {
            res.render('landingPage', { skills, user}); // Pass skills to the EJS template and optional user info
        })
        .catch(error => {
            console.error('Error fetching skills:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.get('/profile', (req, res) => {
    res.render('profile', {
        title: 'profile'
    });
});

app.get('/post', (req, res) => {
    res.render('post', {
        title: 'post'
    });
});


app.post('/submit-post', (req, res) => {
    // Extract form values from req.body
    const description = req.body.description; 
    const title = req.body.title; 
    // this needs to be changes
    //const category_id = 2;
    // this needs to be a variables
    const user_id = 1;
    const price = 0;
    const created_at = new Date().toISOString().split('T')[0]; // Default to today;
    const is_active = true;

    // Insert the new service into the database
    knex('skills')
        .insert({
            description: description.toUpperCase(), // Ensure description is uppercase
            title: title,
            //category_id: category_id,
            user_id:user_id,
            price:price,
            created_at: created_at,
            is_active:is_active
        })
        .then(() => {
            res.redirect('/landingPage'); // Redirect to the Pokémon list page after adding
        })
        .catch(error => {
            console.error('Error adding Service:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.listen(port, () => console.log('Listening on port', port));