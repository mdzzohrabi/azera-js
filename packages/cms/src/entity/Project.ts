import { ORM } from '@azera/stack';
import { Config } from './Config';
const { Entity, PrimaryGeneratedColumn, Column, OneToMany } = ORM;

@Entity({
    schema: 'CM',
    name: 'Project'
})
export class Project {

    @PrimaryGeneratedColumn() Id!: number

    @Column() Name!: string

    @OneToMany(type => Config, config => config.Project) Configs!: Config[]

}