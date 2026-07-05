# Stage 1: Build stage
FROM openjdk:17-slim AS builder

WORKDIR /app

# Copy the libraries and source code
COPY lib/ lib/
COPY src/ src/

# Create the binary target directory
RUN mkdir bin

# Compile all Java files (using Linux path separator ':' for classpath)
RUN javac -encoding UTF-8 -cp "lib/mysql-connector-j-8.4.0.jar:lib/gson-2.11.0.jar" -d bin src/model/*.java src/db/*.java src/service/*.java src/controller/*.java src/Main.java

# Stage 2: Runtime stage
FROM openjdk:17-slim

WORKDIR /app

# Copy compiled classes, static libraries, and public web assets from the builder stage
COPY --from=builder /app/bin bin
COPY lib/ lib/
COPY public/ public/

# Expose port 8080
EXPOSE 8080

# Start the server (using Linux path separator ':' for classpath)
CMD ["java", "-cp", "bin:lib/mysql-connector-j-8.4.0.jar:lib/gson-2.11.0.jar", "Main"]
