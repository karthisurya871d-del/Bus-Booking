require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined
});
connection.connect((err) => {
    if (err) {
        console.log("MYSQL CONNECTION FAILED");
        console.log(err);
        return;
    }
    console.log("MYSQL DATABASE CONNECTED");
});
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
app.post("/register", (req, res) => {
    console.log("REGISTER REQUEST");
    console.log(req.body);
    const {
        name,
        email,
        phone,
        password
    } = req.body;
    if (!name || !email || !phone || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }
    const checkSql=`SELECT id FROM users WHERE 
    email = ? OR phone = ?`;
    connection.query(
        checkSql,
        [email, phone],
        (err, result) => {
            if (err) {
                console.log("CHECK USER ERROR:");
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
            if(result.length > 0){
                return res.status(400).json({
                    success: false,
                    message: "Email or phone number already registered"
                });
            }
            const sql=`INSERT INTO users(name, email, phone, password) VALUES (?, ?, ?, ?)`;
            connection.query(sql,[name, email, phone, password],(err, result)=>{
                    if (err) {
                        console.log("REGISTRATION INSERT ERROR:");
                        console.log(err);
                        return res.status(500).json({
                            success: false,
                            message: err.message
                        });
                    }
                    console.log("User inserted successfully!");
                    console.log("User ID:", result.insertId);
                    res.json({
                        success: true,
                        message: "Registration successful",
                        user_id: result.insertId
                    });
                }
            );
        }
    );
});
app.post("/login",(req, res)=>{
    console.log("LOGIN REQUEST");
    console.log(req.body);
    const {email, password} = req.body;
    if (!email||!password){
        return res.status(400).json({
            success: false,
            message: "Email/phone and password are required"
        });
    }
    const sql=`SELECT * FROM users WHERE (email = ? OR phone = ?)AND password =?`;
    connection.query(sql,[email, email, password],(err, result)=>{
            if (err) {
                console.log("LOGIN ERROR:");
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
            if(result.length===0) {
                return res.json({
                    success: false,
                    message: "Invalid email/phone or password"
                });
            }
            console.log("Login successful for:", email);
            res.json({
                success: true,
                message: "Login successful",
                user: result[0]
            });
        }
    );
});
app.get("/buses",(req, res)=>{
    const source = req.query.source
        ? req.query.source.trim()
        : "";
    const destination = req.query.destination
        ? req.query.destination.trim()
        : "";
    console.log("Requested Source:", source);
    console.log("Requested Destination:", destination);
    if (!source || !destination){
        return res.status(400).json({
            success: false,
            message: "Source and destination are required"
        });
    }
    const sql = `
        SELECT
            id,
            bus_name,
            bus_type,
            source,
            destination,
            departure_time,
            arrival_time,
            price
        FROM buses
        WHERE
            LOWER(TRIM(source)) = LOWER(TRIM(?))
            AND LOWER(TRIM(destination)) = LOWER(TRIM(?))ORDER BY departure_time`;
    connection.query(sql,[source, destination],(err, result)=>{
            if(err){
                console.log("GET BUSES ERROR:");
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
            console.log("Matching buses:", result.length);
            console.log(result);
            res.json(result);
        }
    );
});
app.get("/seats/:busId",(req,res)=>{
    const busId = req.params.busId;
    const journeyDate = req.query.date;
    console.log("GET BOOKED SEATS");
    console.log("Bus ID:", busId);
    console.log("Journey Date:", journeyDate);
    if (!journeyDate) {
        return res.status(400).json({
            success: false,
            message: "Journey date is required"
        });
    }
    const sql=`SELECT seat_number FROM bookings WHERE bus_id = ? AND travel_date = ? AND booking_status = 'CONFIRMED'`;
    connection.query(sql,[busId, journeyDate],(err, result)=>{
            if (err) {
                console.log("GET SEATS ERROR:");
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
            console.log("Booked seats:", result);
            res.json(result);
        }
    );
});
app.post("/booking",(req, res)=>{
    console.log("BOOKING REQUEST");
    console.log(req.body);
    const {
        user_id,
        bus_id,
        passenger_name,
        age,
        gender,
        phone,
        email,
        source,
        destination,
        travel_date,
        boarding_point,
        dropping_point,
        seat_number,
        amount
    } = req.body;
    if (
        !user_id ||
        !bus_id ||
        !passenger_name ||
        !age ||
        !gender ||
        !phone ||
        !email ||
        !source ||
        !destination ||
        !travel_date ||
        !boarding_point ||
        !dropping_point ||
        !seat_number ||
        amount === undefined ||
        amount === null
    ) {
        return res.status(400).json({
            success: false,
            message: "All booking fields are required"
        });
    }
    const busSql = `
        SELECT
            id,
            bus_name,
            bus_type,
            source,
            destination,
            departure_time,
            arrival_time,
            price
        FROM buses
        WHERE id = ?`;
    connection.query( busSql,[bus_id],(err, busResult)=> {
            if (err) {
                console.log("BUS CHECK ERROR:");
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
            if (busResult.length===0){
                return res.status(400).json({
                    success: false,
                    message: "Selected bus does not exist"
                });
            }
            const bus = busResult[0];
            if (bus.source.trim().toLowerCase()!==source.trim().toLowerCase() ||
                bus.destination.trim().toLowerCase() !==
                destination.trim().toLowerCase()){
                return res.status(400).json({
                    success: false,
                    message: "Selected bus does not match the searched route"
                });
            }
            if(Number(amount)!==Number(bus.price)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid bus price"
                });
            }
            const checkSeatSql = `
                SELECT booking_id
                FROM bookings
                WHERE bus_id = ?
                AND travel_date = ?
                AND seat_number = ?
                AND booking_status = 'CONFIRMED'`;
            connection.query(
                checkSeatSql,
                [bus_id, travel_date, seat_number],
                (err, seatResult) => {
                    if (err) {
                        console.log("SEAT CHECK ERROR:");
                        console.log(err);
                        return res.status(500).json({
                            success: false,
                            message: err.message
                        });
                    }
                    if (seatResult.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: `Seat ${seat_number} is already booked`
                        });
                    }
                    const booking_id = "RB" + Date.now();
                    const sql=`
                        INSERT INTO bookings
                        (
                            booking_id,
                            user_id,
                            bus_id,
                            passenger_name,
                            age,
                            gender,
                            phone,
                            email,
                            source,
                            destination,
                            travel_date,
                            boarding_point,
                            dropping_point,
                            seat_number,
                            amount,
                            booking_status
                        )
                        VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
                    `;

                    connection.query(
                        sql,
                        [
                            booking_id,
                            user_id,
                            bus_id,
                            passenger_name,
                            age,
                            gender,
                            phone,
                            email,
                            source,
                            destination,
                            travel_date,
                            boarding_point,
                            dropping_point,
                            seat_number,
                            amount
                        ],
                        (err, result) => {

                            if (err) {

                                console.log("BOOKING INSERT ERROR:");
                                console.log(err);

                                return res.status(500).json({
                                    success: false,
                                    message: err.message
                                });
                            }

                            console.log("Booking inserted successfully!");
                            console.log("Booking ID:", booking_id);
                            res.json({
                                success: true,
                                message: "Booking successful",
                                booking_id: booking_id
                            });
                        }
                    );
                }
            );
        }
    );
});
app.get("/booking/:bookingId", (req, res) => {
    const bookingId = req.params.bookingId;
    console.log("GET BOOKING DETAILS");
    console.log("Booking ID:", bookingId);
    const sql = `
        SELECT
            bookings.booking_id,
            bookings.user_id,
            bookings.bus_id,
            bookings.passenger_name,
            bookings.age,
            bookings.gender,
            bookings.phone,
            bookings.email,
            bookings.source,
            bookings.destination,
            bookings.travel_date,
            bookings.boarding_point,
            bookings.dropping_point,
            bookings.seat_number,
            bookings.amount,
            bookings.booking_status,
            buses.bus_name,
            buses.bus_type,
            buses.departure_time,
            buses.arrival_time

        FROM bookings
        JOIN buses
            ON bookings.bus_id = buses.id

        WHERE bookings.booking_id = ?`;
    connection.query(
        sql,
        [bookingId],
        (err, result) => {
            if (err) {
                console.log("GET BOOKING ERROR:");
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
            if (result.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }
            console.log("Booking found:");
            console.log(result[0]);

            res.json({
                success: true,
                booking: result[0]
            });
        }
    );
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

});