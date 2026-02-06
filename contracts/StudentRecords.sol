// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StudentRecords
 * @dev Smart contract for storing and verifying student record hashes
 * @notice This contract stores cryptographic hashes of student records for immutability
 */
contract StudentRecords {
    
    // Structure to store record information
    struct Record {
        bytes32 dataHash;       // SHA-256 hash of the record data
        bytes32 ipfsHash;       // IPFS content hash
        address issuer;         // Institution wallet that issued the record
        uint256 timestamp;      // Block timestamp when record was stored
        bool exists;            // Flag to check if record exists
    }
    
    // Structure to store student information
    struct Student {
        string studentId;       // Unique student identifier
        bytes32 registrationHash;  // Hash of student registration data
        address registeredBy;   // Institution that registered the student
        uint256 registeredAt;   // Registration timestamp
        bool isActive;          // Student active status
    }
    
    // Mappings
    mapping(string => Student) private students;           // studentId => Student
    mapping(string => Record[]) private studentRecords;    // studentId => Records array
    mapping(bytes32 => bool) private hashExists;           // dataHash => exists
    mapping(address => bool) public authorizedInstitutions; // institution address => authorized
    
    // State variables
    address public owner;
    uint256 public totalRecords;
    uint256 public totalStudents;
    
    // Events
    event StudentRegistered(string indexed studentId, bytes32 registrationHash, address indexed institution, uint256 timestamp);
    event RecordStored(string indexed studentId, bytes32 dataHash, bytes32 ipfsHash, address indexed issuer, uint256 timestamp);
    event RecordVerified(string indexed studentId, bytes32 dataHash, bool verified, uint256 timestamp);
    event InstitutionAuthorized(address indexed institution, uint256 timestamp);
    event InstitutionRevoked(address indexed institution, uint256 timestamp);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedInstitutions[msg.sender] || msg.sender == owner, "Not authorized institution");
        _;
    }
    
    modifier studentExists(string memory _studentId) {
        require(students[_studentId].isActive, "Student does not exist or is inactive");
        _;
    }
    
    /**
     * @dev Constructor - sets the contract owner
     */
    constructor() {
        owner = msg.sender;
        authorizedInstitutions[msg.sender] = true;
    }
    
    /**
     * @dev Authorize an institution to store records
     * @param _institution Address of the institution to authorize
     */
    function authorizeInstitution(address _institution) external onlyOwner {
        require(_institution != address(0), "Invalid address");
        require(!authorizedInstitutions[_institution], "Already authorized");
        
        authorizedInstitutions[_institution] = true;
        emit InstitutionAuthorized(_institution, block.timestamp);
    }
    
    /**
     * @dev Revoke authorization from an institution
     * @param _institution Address of the institution to revoke
     */
    function revokeInstitution(address _institution) external onlyOwner {
        require(authorizedInstitutions[_institution], "Not authorized");
        require(_institution != owner, "Cannot revoke owner");
        
        authorizedInstitutions[_institution] = false;
        emit InstitutionRevoked(_institution, block.timestamp);
    }
    
    /**
     * @dev Register a new student
     * @param _studentId Unique student identifier
     * @param _registrationHash Hash of student registration data
     */
    function registerStudent(
        string memory _studentId,
        bytes32 _registrationHash
    ) external onlyAuthorized {
        require(bytes(_studentId).length > 0, "Student ID cannot be empty");
        require(!students[_studentId].isActive, "Student already registered");
        
        students[_studentId] = Student({
            studentId: _studentId,
            registrationHash: _registrationHash,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        totalStudents++;
        emit StudentRegistered(_studentId, _registrationHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Store a record hash for a student
     * @param _studentId Student identifier
     * @param _dataHash SHA-256 hash of the record data
     * @param _ipfsHash IPFS content hash where document is stored
     */
    function storeRecord(
        string memory _studentId,
        bytes32 _dataHash,
        bytes32 _ipfsHash
    ) external onlyAuthorized studentExists(_studentId) {
        require(_dataHash != bytes32(0), "Invalid data hash");
        require(!hashExists[_dataHash], "Record hash already exists");
        
        Record memory newRecord = Record({
            dataHash: _dataHash,
            ipfsHash: _ipfsHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        studentRecords[_studentId].push(newRecord);
        hashExists[_dataHash] = true;
        totalRecords++;
        
        emit RecordStored(_studentId, _dataHash, _ipfsHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Verify if a record hash exists and matches
     * @param _studentId Student identifier
     * @param _dataHash Hash to verify
     * @return verified Boolean indicating if hash is valid
     * @return issuer Address of the institution that issued the record
     * @return timestamp When the record was stored
     */
    function verifyRecord(
        string memory _studentId,
        bytes32 _dataHash
    ) external view returns (bool verified, address issuer, uint256 timestamp) {
        Record[] memory records = studentRecords[_studentId];
        
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].dataHash == _dataHash) {
                return (true, records[i].issuer, records[i].timestamp);
            }
        }
        
        return (false, address(0), 0);
    }
    
    /**
     * @dev Check if a hash exists in the system
     * @param _dataHash Hash to check
     * @return Boolean indicating if hash exists
     */
    function hashExistsInSystem(bytes32 _dataHash) external view returns (bool) {
        return hashExists[_dataHash];
    }
    
    /**
     * @dev Get student information
     * @param _studentId Student identifier
     * @return registrationHash Student registration hash
     * @return registeredBy Institution that registered the student
     * @return registeredAt Registration timestamp
     * @return isActive Student active status
     */
    function getStudent(string memory _studentId) external view returns (
        bytes32 registrationHash,
        address registeredBy,
        uint256 registeredAt,
        bool isActive
    ) {
        Student memory student = students[_studentId];
        return (
            student.registrationHash,
            student.registeredBy,
            student.registeredAt,
            student.isActive
        );
    }
    
    /**
     * @dev Get number of records for a student
     * @param _studentId Student identifier
     * @return Number of records
     */
    function getRecordCount(string memory _studentId) external view returns (uint256) {
        return studentRecords[_studentId].length;
    }
    
    /**
     * @dev Get a specific record for a student
     * @param _studentId Student identifier
     * @param _index Record index
     * @return dataHash Record data hash
     * @return ipfsHash IPFS hash
     * @return issuer Issuing institution
     * @return timestamp Storage timestamp
     */
    function getRecord(
        string memory _studentId,
        uint256 _index
    ) external view returns (
        bytes32 dataHash,
        bytes32 ipfsHash,
        address issuer,
        uint256 timestamp
    ) {
        require(_index < studentRecords[_studentId].length, "Index out of bounds");
        Record memory record = studentRecords[_studentId][_index];
        return (record.dataHash, record.ipfsHash, record.issuer, record.timestamp);
    }
    
    /**
     * @dev Get contract statistics
     * @return _totalStudents Total registered students
     * @return _totalRecords Total stored records
     * @return _owner Contract owner address
     */
    function getStats() external view returns (
        uint256 _totalStudents,
        uint256 _totalRecords,
        address _owner
    ) {
        return (totalStudents, totalRecords, owner);
    }
}
