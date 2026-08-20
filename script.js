async function registerUser(event) {
    event.preventDefault();
    const inputs=document.querySelectorAll("input");
    const name=inputs[0].value.trim();
    const email=inputs[1].value.trim();
    const phone=inputs[2].value.trim();
    const password=inputs[3].value;
    const confirmPassword=inputs[4].value;
    if (password!==confirmPassword){
        alert("Passwords do not match");
        return;
    }
    try{
        const response=await fetch("/register", {
            method:"POST",
            headers:{
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                password: password

            })
        });
        const data=await response.json();
        if (data.success) {
            alert("Registration successful!");
            window.location.href = "login.html";
        } else {
            alert(data.message || "Registration failed");
        }
    } catch (error) {
        console.error("Registration Error:", error);
        alert("Unable to connect to server");
    }
}
async function loginUser(event) {
    event.preventDefault();
    const inputs=document.querySelectorAll("input");
    const email=inputs[0].value.trim();
    const password=inputs[1].value;
    try {
        const response=await fetch("/login", {
            method:"POST",
            headers:{
                "Content-Type": "application/json"
            },
            body:JSON.stringify({
                email: email,
                password: password
            })
        });
        const data=await response.json();
        if(data.success){
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );
            alert("Login successful!");
            window.location.href="index.html";
        }else{
            alert(data.message || "Invalid login details");
        }
    } catch(error) {
        console.error("Login Error:", error);
        alert("Unable to connect to server");
    }
}
function searchBus(){
    const inputs=document.querySelectorAll(".search-box input");
    const source=inputs[0].value.trim();
    const destination=inputs[1].value.trim();
    const date=inputs[2].value;
    if (!source||!destination||!date){
        alert("Please enter source, destination and journey date");
        return;
    }
    localStorage.setItem("source",source);
    localStorage.setItem("destination",destination);
    localStorage.setItem("travel_date",date);
    window.location.href ="buses.html";
}
async function loadBuses(){
    try{
        const response=await fetch("/buses");
        if(!response.ok){
            throw new Error("Unable to load buses");
        }
        const buses=await response.json();
        console.log("Buses from database:",buses);
        return buses;
    } catch(error){
        console.error("Bus Loading Error:",error);
        alert("Unable to load buses from database");
        return [];
    }
}
function selectBus(bus){
    if(!bus){
        alert("Invalid bus information");
        return;
    }
    if(!bus.id){
        alert("Bus ID is missing");
        console.error("Invalid bus:",bus);
        return;
    }
    console.log("Selected bus:",bus);
    localStorage.setItem("selectedBus",JSON.stringify(bus));
    localStorage.removeItem("selectedSeat");
    localStorage.removeItem("passenger");
    window.location.href ="seats.html";
}
function selectSeat(seat){
    if(!seat){
        return;
    }
    if(seat.classList.contains("booked")) {
        alert("This seat is already booked");
        return;
    }
    document.querySelectorAll(".seat").forEach(function (s) {
            s.classList.remove("selected");
        });
    seat.classList.add("selected");
    const seatNumber=seat.textContent.trim();
    localStorage.setItem("selectedSeat",seatNumber);
    console.log("Selected seat:",seatNumber);
}
function savePassenger(event){
    event.preventDefault();
    const inputs=document.querySelectorAll("input");
    const selects=document.querySelectorAll("select");
    const passenger={
        name:inputs[0].value.trim(),
        age:inputs[1].value,
        gender:selects[0].value,
        phone:inputs[2].value.trim(),
        email:inputs[3].value.trim(),
        boarding:selects[1].value,
        dropping:selects[2].value
    };
    if(!passenger.name||!passenger.age||!passenger.gender||!passenger.phone||!passenger.email||!passenger.boarding||!passenger.dropping){
        alert("Please fill all passenger details");
        return;
    }

    localStorage.setItem("passenger",JSON.stringify(passenger));
    window.location.href="booking.html";
}
async function confirmBooking(){
    try{
        const user=JSON.parse(localStorage.getItem("user"));
        const bus=JSON.parse(localStorage.getItem("selectedBus"));
        const passenger=JSON.parse(localStorage.getItem("passenger"));
        const seat=localStorage.getItem("selectedSeat");
        const source=localStorage.getItem("source");
        const destination=localStorage.getItem("destination");
        const date=localStorage.getItem("travel_date");
        if(!user){
            alert("Please login first");
            window.location.href="login.html";
            return;
        }
        if(!bus){
            alert("Bus information is missing");
            window.location.href ="buses.html";
            return;
        }
        if(!bus.id){
            alert("Invalid bus ID");
            console.error("Bus:",bus);
            return;
        }
        if (bus.price === undefined||bus.price === null){
            alert("Bus price is missing");
            console.error("Bus:",bus);
            return;
        }
        if(!passenger){
           alert("Passenger information is missing");
            window.location.href ="passenger.html";
            return;
        }
        if(!seat){
            alert("Please select a seat");
            window.location.href="seats.html";
            return;
        }
        if(!source||!destination||!date){
            alert("Journey information is missing");
            window.location.href="index.html";
            return;
        }
        const booking={
            user_id:user.id,
            bus_id:bus.id,
            passenger_name:passenger.name,
            age:passenger.age,
            gender:passenger.gender,
            phone:passenger.phone,
            email:passenger.email,
            source:source,
            destination:destination,
            travel_date:date,
            boarding_point:passenger.boarding,
            dropping_point:passenger.dropping,
            seat_number:seat,
            amount:Number(bus.price)
        };
        console.log("Booking sent to server:",booking);
        const response=await fetch("/booking",{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify(booking)
                }
            );
        if(!response.ok){
            throw new Error(
                "Server returned error: " +
                response.status
            );
        }
        const data=await response.json();
        console.log("Booking server response:",data);
        if(data.success){
            localStorage.setItem("booking_id",data.booking_id);
            alert("Booking successful!");
            window.location.href="success.html";
        }else{
            alert(data.message||"Booking failed");
        }
    }catch(error){
        console.error("Booking Error:",error);
        alert("Unable to connect to server. " +"Please check whether server.js is running.");
    }
}