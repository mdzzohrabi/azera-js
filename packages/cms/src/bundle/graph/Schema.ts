import { gql } from 'apollo-server';

export default gql`
extend type Query {
    hello: String @deprecated(reason: "Not")
    users: [User] @findAll
}

"""
User model
"""
type User 
@dataSource(name: "CM.User", connection: "cmis")
{
    "Username"    
    username: String
}
`