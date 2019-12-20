import { ORM } from '@azera/stack';
import { Project } from './Project';
const { Entity, PrimaryGeneratedColumn, Column, ManyToOne } = ORM;

@Entity({
    schema: 'CM',
    name: 'Config'
})
export class Config {

    @PrimaryGeneratedColumn() Id!: number

    @ManyToOne(type => Project, project => project.Configs) Project!: Project
    @Column() Scope!: string
    @Column() Name!: string
    @Column() Value!: string

}