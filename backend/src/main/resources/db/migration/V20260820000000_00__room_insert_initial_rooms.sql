INSERT INTO rooms (room_id,room_name,capacity,location)
SELECT 1,'한강 회의실',8,'3층'
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_id = 1);

INSERT INTO rooms (room_id,room_name,capacity,location)
SELECT 2,'남산 회의실',4,'2층'
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_id = 2);

INSERT INTO rooms (room_id,room_name,capacity,location)
SELECT 3,'북한산 회의실',12,'4층'
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_id = 3);
